function stringToDate(s)
{
  var parts = s.split('-');
  return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
}

var kMSPerDay = 24 * 60 * 60 * 1000;

function allMondays(axis) {
  d = new Date(axis.min);

  // go to the first Monday
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  d.setSeconds(0);
  d.setMinutes(0);
  d.setHours(0);

  var ticks = [];

  var i = d.getTime();
  do {
    ticks.push([i, (new Date(i)).toLocaleFormat("%Y-%m-%d")]);
    i += 7 * kMSPerDay;
  } while (i < axis.max);

  return ticks;
}

function weekendAreas(axes) {
  var markings = [],
  d = new Date(axes.xaxis.min);

  // go to the first Saturday

  d.setDate(d.getDate() - ((d.getDay() + 1) % 7))
  d.setSeconds(0);
  d.setMinutes(0);
  d.setHours(0);

  var i = d.getTime();

  // when we don't set yaxis, the rectangle automatically
  // extends to infinity upwards and downwards

  do {
	markings.push({ xaxis: { from: i, to: i + 2 * 24 * 60 * 60 * 1000 } });
	i += 7 * 24 * 60 * 60 * 1000;
  } while (i < axes.xaxis.max);

  return markings;
}

function go() {
  loadData(null, 'text', function(data) {
    var buildmap = {};

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

    $.each(buildmap, function(build, data) {
      chartdata.push({
        data: data,
      });
      var m = /^(\d{4})(\d{2})(\d{2})(\d{2})/.exec(build);
      var builddate = new Date(parseInt(m[1]),
                               parseInt(m[2]) - 1,
                               parseInt(m[3]),
                               parseInt(m[4]));
      totalschart.push([builddate.getTime(), data.total]);
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
    console.log(totalschart);

    $('#chart').width((maxDate - minDate) / kMSPerDay * 24);
    $('#chart').height(500);

    $.plot($('#chart'), chartdata, {
      legend: { show: false },
      series: {
        lines: {
          show: true,
        },
      },
      xaxis: {
        mode: "time",
        timesonze: "browser",
        // tickSize: [7, "day"],
        ticks: allMondays,
        min: minDate,
        max: maxDate,
      },
      grid: {
        markings: weekendAreas,
      },
    });
  });
}

$(go);
