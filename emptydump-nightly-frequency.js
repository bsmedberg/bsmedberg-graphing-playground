function buildIDToDate(build)
{
  var y = parseInt(build.slice(0, 4));
  var m = parseInt(build.slice(4, 6));
  var d = parseInt(build.slice(6, 8));
  var h = parseInt(build.slice(8, 10));

  return new Date(y, m - 1, d, h);
}

function go() {
  loadData(null, 'text', function(csvdata) {
    var data = [];
    var labels = [];
    $.each($.csv.toArrays(csvdata),
      function(i, v) {
        var build = v[0];
        var adu = parseInt(v[1]);
        var crashes = parseInt(v[2]);

        if (adu == 0) {
          return;
        }

        data.push([buildIDToDate(build).getTime(), crashes / adu]);
        labels.push([buildIDToDate(build).getTime(), build]);
      });

    chartdata = [
      {
        color: "rgba(0,0,0,0.6)",
        data: data,
      },
    ];
    $('#chart').width((data[data.length - 1][0] - data[0][0]) / kMSPerDay * 12);
    $.plot($('#chart'), chartdata, {
      series: {
        bars: {
          show: true,
          barWidth: kMSPerDay * 0.4,
          lineWidth: 1,
          fillColor: "rgba(0,0,0,0.3)",
          align: "center",
        },
      },
      xaxis: {
        axisLabel: "BuildID",
        axisLabelPadding: 80,
        mode: "time",
        timezone: "browser",
        ticks: labels,
        tickLength: 0,
        min: data[0][0] - kMSPerDay / 2,
        max: data[data.length - 1][0] + kMSPerDay / 2,
        color: "#333",
      },
      yaxis: {
        axisLabel: "Crashes per ADU",
        tickLength: 0,
        color: "#333",
      },
      grid: {
        labelMargin: 1,
      },
    });
  });
}
$(go);
