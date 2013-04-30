import os
import ast
import sys
import svgwrite
from collections import namedtuple
import math
import json

RowType = namedtuple('RowType', ('k',
                                 'Signature',
                                 'LargestVirtualBlock',
                                 'TotalVirtualMemory',
                                 'SystemMemoryUsePercentage',
                                 'AvailableVirtualMemory',
                                 'AvailablePageFile',
                                 'AvailablePhysicalMemory'))

data = [RowType(*ast.literal_eval(line))
        for line in open('data/memoryslurp-130410-15')]
maxsize = max((i.LargestVirtualBlock for i in data if i.LargestVirtualBlock != 'error'))
minsize = min((i.LargestVirtualBlock for i in data if i.LargestVirtualBlock != 'error'))

maxpage = max((int(i.AvailablePageFile) for i in data if i.AvailablePageFile is not None))
minpage = min((int(i.AvailablePageFile) for i in data if i.AvailablePageFile is not None))

graphSize = 1400
margin = 4
dotSize = 8
tickLength = 4

fontSize = 10
fontHeight = fontSize * 1.3

graphOffset = margin + fontHeight + margin + fontHeight + tickLength
innerSize = graphSize - graphOffset - margin

MB = 0x100000

log = 10

logminsize = math.log(minsize, log)
logmaxsize = math.log(maxsize, log)

logminpage = math.log(minpage, log)
logmaxpage = math.log(maxpage, log)

def translatey(val):
    return innerSize / (logmaxpage - logminpage) * (math.log(val, log) - logminpage)

def translatex(val):
    return innerSize / (logmaxsize - logminsize) * (math.log(val, log) - logminsize)

def ticks(mintick, maxtick):
    printticks = (1, 5)
    base = MB
    while True:
        for m in xrange(1, 16):
            val = m * base
            if val > maxtick:
                return
            if val < mintick:
                continue
            yield val, (m in printticks)
        base = base * 10

d = svgwrite.Drawing(debug=False,
                     id='graphRoot',
                     viewBox='0 0 %s %s' % (graphSize, graphSize),
                     preserveAspectRatio='xMinYMin')
d.add(d.path(('m', graphOffset, margin,
              'L', graphOffset, margin + innerSize,
              'L', graphOffset + innerSize, margin + innerSize), class_='border'))

for tickval, printtick in ticks(minsize, maxsize):
    xpos = translatex(tickval) + graphOffset
    d.add(d.line((xpos, margin + innerSize),
                 (xpos, margin + innerSize + tickLength), class_='tick'))
    if printtick:
        d.add(d.text(tickval / 0x100000,
                     (xpos, margin + innerSize + tickLength + margin),
                     class_="tickLabel xaxis"))

d.add(d.text("Largest Virtual Memory Block (MB)",
             (graphSize / 2, margin + innerSize + tickLength + margin + fontHeight + margin),
             class_="axisLabel xaxis"))

for tickval, printtick in ticks(minpage, maxpage):
    ypos = margin + innerSize - translatey(tickval)
    d.add(d.line((graphOffset - tickLength, ypos),
                 (graphOffset, ypos), class_='tick'))
    if printtick:
        t = d.add(d.text(tickval / 0x100000,
                         (graphOffset - tickLength - margin, ypos),
                         class_="tickLabel yaxis"))
        t.rotate(-90, (graphOffset - tickLength - margin, ypos))

t = d.add(d.text("MEMORYSTATUS.dwAvailVirtual (MB)",
                 (margin + fontHeight, graphSize / 2),
                 class_="axisLabel yaxis"))
t.rotate(-90, (margin + fontHeight, graphSize / 2))

for i in data:
    if i.LargestVirtualBlock == 'error':
        continue
    xpos = translatex(i.LargestVirtualBlock) + graphOffset
    ypos = margin + innerSize - translatey(int(i.AvailablePageFile))
    mark = d.add(d.circle((xpos, ypos), dotSize / 2, class_="mark"))
    mark['uuid'] = i.k[7:]
    for item in RowType._fields[1:]:
        mark[item] = getattr(i, item)

minScale = max(minsize, minpage)
maxScale = min(maxsize, maxpage)

d.add(d.path(('m', translatex(minScale) + graphOffset, margin + innerSize - translatey(minScale),
              'L', translatex(maxScale) + graphOffset, margin + innerSize - translatey(maxScale)),
             class_='divider'))

detailsWidth = 400
detailsHeight = 215

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
link = g.add(d.a('about:blank', id='reportLink'))
link.add(d.text('link', (0, fontHeight), id='reportLinkText', class_='detailsText'))
pos = fontHeight * 2
for item in RowType._fields[1:]:
    g.add(d.text(item, (0, pos), id='label' + item, class_='detailsText'))
    pos += fontHeight
    g.add(d.text(item, (10, pos), id='report' + item, class_='detailsText'))
    pos += fontHeight

d.add(d.clipPath(id='detailsClip')).add(d.use('#detailBox'))

f = d.defs.add(d.filter(id='detailsShadow'))
f.feOffset('SourceAlpha', result='offset', dx=1.5, dy=1.5)
f.feGaussianBlur('offset', result='blurred', stdDeviation=1)
f.feComponentTransfer('blurred', result='lightBlurOut').feFuncA('linear', slope=0.5, intercept=0)
f.feBlend(in_='SourceGraphic', in2='lightBlurOut')

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
  text-anchor: middle;
}
.xaxis {
  dominant-baseline: hanging;
}
.axisLabel {
  font-weight: bold;
}
.mark {
  stroke: none;
  fill: rgba(0, 0, 0, 0.6);
}
.mark:hover {
  fill: #0CA;
}
.divider {
  fill: none;
  stroke: rgba(40, 40, 255, 0.6);
  stroke-width: 2;
}
#detailBox {
  // filter: url(#detailsShadow);
  // fill: #F6F6F6;
  fill: #e3e1af;
  stroke: #919071;
  stroke-width: 1;
}
#details {
  visibility: hidden;
  // clip-path: url(#detailsClip);
}
.detailsText {
  font-size: %(fontSize)dpt;
}
#reportLinkText {
  fill: #00F;
  text-decoration: underline;
}
#reportLinkText:hover {
  fill: #66F;
}
""" % {'fontSize': fontSize}))

d.add(d.script(type='text/javascript',
               href='http://d3js.org/d3.v3.min.js'))
d.add(d.script(type='text/javascript',
               content="""
var rowFields = %(rowFields)s;

d3.selectAll('#graphRoot').on('click', function() {
  if (d3.event.target == d3.event.currentTarget) {
    d3.select('#details').style('visibility', 'hidden');
    return;
  }

  var mark = d3.select(d3.event.target);
  if (!mark.classed('mark')) {
    return;
  }

  var px = mark.property('cx').baseVal.value;
  var py = mark.property('cy').baseVal.value;
  d3.select('#details').style('visibility', 'visible').property('transform').baseVal.getItem(0).setTranslate(px, py);

  d3.select('#reportLink').property('href').baseVal = 'https://crash-stats.mozilla.com/report/index/' + mark.attr('uuid');
  d3.select('#reportLinkText').text(mark.attr('uuid'));
  for (var i = 0; i < rowFields.length; ++i) {
    var field = rowFields[i];
    d3.select('#report' + field).text(mark.attr(field));
  }  

  var scalex, scaley, offsetx, offsety;
  if (px < %(graphSize)s - %(detailsWidth)s) {
    scalex = 1;
    offsetx = 15;
  }
  else {
    scalex = -1;
    offsetx = -%(detailsWidth)s + 5;
  }
  if (py < %(graphSize)s - %(detailsHeight)s) {
    scaley = 1;
    offsety = 2 + %(fontHeight)s;
  } else {
    scaley = -1;
    offsety = -%(detailsHeight)s + 2;
  }
  d3.select('#detailBox').property('transform').baseVal.getItem(0).setScale(scalex, scaley);
  d3.select('#detailText').property('transform').baseVal.getItem(0).setTranslate(offsetx, offsety);
});
""" % {'graphSize': graphSize,
       'fontHeight': fontHeight,
       'detailsWidth': detailsWidth,
       'detailsHeight': detailsHeight,
       'rowFields': json.dumps(RowType._fields[1:])}))

d.write(sys.stdout)
