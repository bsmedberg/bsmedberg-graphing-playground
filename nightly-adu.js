function stringToDate(s)
{
  var parts = s.split('-');
  return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
}

var kStartColor = $.Color('blue');
var kEndColor = $.Color('green');

function go() {
  loadData(null, 'text', function(data) {
    var buildmap = {};

    var allbuilds = [];

    var minDate = Date.now();
    var maxDate = 0;

    $.each($.csv.toArrays(data),
           function(i, v) {
             var build = v[0];
             var date = stringToDate(v[1]).getTime();
             var count = parseInt(v[2]);

             if (date < minDate) {
               minDate = date;
             }
             if (date > maxDate) {
               maxDate = date;
             }

             var l;
             if (!(build in buildmap)) {
               allbuilds.push(build);
               l = [];
               l.total = 0;
               buildmap[build] = l;
             }
             else {
               l = buildmap[build];
             }
             
             l.push([date, count]);
             l.total += count;
           });

    var chartdata = [];
    var totalschart = [];

    var overlapcharts = [];

    $.each(allbuilds, function(i, build) {
      var data = buildmap[build];
      chartdata.push({
        data: data,
        color: kStartColor.transition(kEndColor, i / allbuilds.length).toHexString(),
      });
      var m = /^(\d{4})(\d{2})(\d{2})(\d{2})/.exec(build);
      var builddate = new Date(parseInt(m[1]),
                               parseInt(m[2]) - 1,
                               parseInt(m[3]),
                               parseInt(m[4]));
      totalschart.push([builddate.getTime(), data.total]);

      var buildday = new Date(builddate.getTime());
      buildday.setHours(0);
      var overlapdata = [];
      $.each(data, function(i, d) {
        var time = d[0];
        var c = d[1];
        overlapdata.push([(time - buildday.getTime()) / kMSPerDay, c]);
      });
      overlapcharts.push({
        data: overlapdata,
      });
    });

    chartdata.unshift({
      data: totalschart,
      lines: { show: false },
      bars: {
        show: true,
        barWidth: kMSPerDay * 0.4,
        lineWidth: 1,
        fillColor: "rgba(0,0,0,0.3)",
      },
      color: "rgba(0,0,0,0.6)",
    });

    $('#chart').width((maxDate - minDate) / kMSPerDay * 24);
    $('#chart').height(500);
    $('#chart2').width(400).height(250);

    $.plot($('#chart'), chartdata, {
      legend: { show: false },
      series: {
        lines: {
          show: true,
        },
      },
      xaxis: {
        mode: "time",
        timezone: "browser",
        // tickSize: [7, "day"],
        ticks: allMondays,
        min: minDate,
        max: maxDate,
      },
      grid: {
        markings: weekendAreas,
      },
    });
    $.plot($('#chart2'), overlapcharts, {
      legend: { show: false },
      series: {
        color: "rgba(0, 0, 0, 0.15)",
        lines: {
          show: true,
          lineWidth: 1,
        },
      },
    });
  });
}

$(go);
