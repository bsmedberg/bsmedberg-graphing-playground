import os, sys
import csv
import svgwrite
import svggraph
from collections import namedtuple
from datetime import datetime, timedelta
from time import mktime

def float_xrange(start, stop, step):
    c = start
    while c < stop:
        yield c
        c += step

RowType = namedtuple('RowType', ('buildid', 'users', 'crashcount'))
def intconvert(s):
    if s == '':
        return 0
    return int(s)

def buildid_to_datetime(buildid):
    return datetime(int(buildid[0:4]), int(buildid[4:6]), int(buildid[6:8]),
                    int(buildid[8:10]), int(buildid[10:12]))

fname, = sys.argv[1:]
cdata = csv.reader(open(fname))

builds = [RowType(buildid, intconvert(users), intconvert(crashcount)) for buildid, users, crashcount in cdata]

mindate = buildid_to_datetime(builds[0].buildid) - timedelta(hours=12)
maxdate = buildid_to_datetime(builds[-1].buildid) + timedelta(hours=12)
maxratio = max(float(build.crashcount) / build.users * 100 for build in builds if build.users != 0)

height = 350
width_per_day = 10
dotSize = 8

graph_width = (maxdate - mindate).days * width_per_day

d = svgwrite.Drawing(id='graphRoot',
                     viewBox='0 0 %s %s' % (graph_width,
                                            height),
                     debug=False)
d['width'] = str(graph_width)
d['height'] = str(height)
plot = svggraph.Plot(d, graph_width, height,
                     mktime(mindate.timetuple()), 0,
                     mktime(maxdate.timetuple()), maxratio)
plot.config.yaxis.labelRotate = 0
plot.config.yaxis.labelDepth = 35
plot.config.xaxis.labelRotate = 90
plot.config.xaxis.labelDepth = 125
d.add(plot.root)
plot.drawAxes()

plot.printTicks('x', ((mktime(buildid_to_datetime(build.buildid).timetuple()), build.buildid) for build in builds))
plot.printTicks('y', ((t, str(t)) for t in float_xrange(0, maxratio, .05)))

plot.printXAxisLabel("Crashes in RPCChannel::OnMaybeDequeueOne on the Aurora channel, by BuildID (bug 800347)")
plot.printYAxisLabel("Crashes/100ADI")

for build in builds:
    if build.users == 0:
        continue
    x, y = plot.transform(mktime(buildid_to_datetime(build.buildid).timetuple()),
                          float(build.crashcount) / build.users * 100)
    mark = plot.root.add(d.circle((x, y), dotSize / 2, class_="mark"))
    mark['buildid'] = build.buildid
    mark['users'] = build.users
    mark['crashcount'] = build.crashcount

detailsWidth = 180
fontHeight = plot.fontHeight()
detailsHeight = fontHeight * 5

g = d.add(d.g(id='details'))
g.translate(0,0)
g.add(d.path(('M', 0, 0,
              'L', 10, 15,
              'L', 10, detailsHeight,
              'L', detailsWidth, detailsHeight,
              'L', detailsWidth, 10,
              'L', 15, 10,
              'Z'), id='detailBox')).scale(1)
g = g.add(d.g(id='detailText'))
g.translate(12, 2 + fontHeight)
g.add(d.text('buildid', (0, fontHeight), id='detailsBuildID', class_='detailsText'))
g.add(d.text('users', (0, fontHeight * 2), id='detailsUsers', class_='detailsText'))
g.add(d.text('crashcount', (0, fontHeight * 3), id='detailsCrashCount', class_='detailsText'))

d.add(d.style("""
svg {
  font-family: sans-serif;
}
.border {
  stroke: black;
  stroke-width: 2;
  fill: none;
}
.tick {
  stroke: black;
  stroke-width: 2;
}
.tickLabel,
.axisLabel {
  fill: black;
  font-size: %(fontSize)dpt;
}
.axisLabel {
  font-weight: bold;
  text-anchor: middle;
}
.tickLabel {
  dominant-baseline: middle;
}
.tickLabel.xaxis {
  text-anchor: start;
}
.tickLabel.yaxis {
  text-anchor: end;
}
.mark {
  fill: #5D3799;
}
#detailBox {
  fill: #e3e1af;
  stroke: #919071;
  stroke-width: 1;
}
#details {
  visibility: hidden;
  opacity: 0;
  transition: visibility 0s linear 0.2s,opacity 0.2s ease-in-out;
}
#details.visible {
  visibility: visible;
  opacity: 1;
  transition: opacity 0.2s ease-in-out;
}
#details
.detailsText {
  font-size: %(fontSize)dpt;
}
""" % {'fontSize': plot.config.fontSize}))

d.add(d.script(type='text/javascript',
               href='http://d3js.org/d3.v3.min.js'))
d.add(d.script(type='text/javascript',
               content="""
d3.selectAll('#graphRoot').on('click', function() {
  if (d3.event.target == d3.event.currentTarget) {
    d3.select('#details').classed('visible', false);
    return;
  }

  var mark = d3.select(d3.event.target);
  if (!mark.classed('mark')) {
    return;
  }

  var px = mark.property('cx').baseVal.value;
  var py = mark.property('cy').baseVal.value;
  var d = d3.select('#details');
  d.property('transform').baseVal.getItem(0).setTranslate(px, py);
  d.classed('visible', true);

  d3.select('#detailsBuildID').text(mark.attr('buildid'));
  d3.select('#detailsUsers').text("Users: " + mark.attr('users'));
  d3.select('#detailsCrashCount').text("Crashes: " + mark.attr('crashcount'));

  var scalex, scaley, offsetx, offsety;
  if (px < %(graphWidth)s - %(detailsWidth)s) {
    scalex = 1;
    offsetx = 15;
  }
  else {
    scalex = -1;
    offsetx = -%(detailsWidth)s + 5;
  }
  if (py < %(graphHeight)s - %(detailsHeight)s) {
    scaley = 1;
    offsety = 2 + %(fontHeight)s;
  } else {
    scaley = -1;
    offsety = -%(detailsHeight)s + 2;
  }
  d3.select('#detailBox').property('transform').baseVal.getItem(0).setScale(scalex, scaley);
  d3.select('#detailText').property('transform').baseVal.getItem(0).setTranslate(offsetx, offsety);
});
""" % {'graphWidth': graph_width,
       'graphHeight': height,
       'fontHeight': fontHeight,
       'detailsWidth': detailsWidth,
       'detailsHeight': detailsHeight}))

d.write(sys.stdout)
