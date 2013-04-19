var kLabels = [
  [
    [(new Date(2013, 0, 29)).getTime(), "10.2 and earlier CtP blocklist deployed"],
  ],
  [
    [(new Date(2013, 2, 6)).getTime(), "<10.3-ESR CtP blocklist deployed"],
  ],
  [
    [(new Date(2013, 2, 18)).getTime(), "11.0-11.2 CtP blocklist deployed"],
  ],
];

/**
 * Find the index of the first datapoint in data later than time.
 */
function findFirst(data, time)
{
  var i, dv;
  for (i = 0; i < data.length; ++i) {
    dv = data[i][0];
    if (dv >= time) {
      return i;
    }
  }
  return null;
}

/**
 * @param labels: [[datevalue, "text"], ...]
 */
function labelsForData(data, labels)
{
  var i, label, dv, t, i2;
  var r = [];
  for (i = 0; i < labels.length; ++i) {
    label = labels[i];
    dv = label[0];
    t = label[1];

    i2 = findFirst(data, dv);
    if (i2 != null) {
      r[i2] = t;
    }
  }
  return r;
}

var gChartData;

function go() {
  loadData(null, 'text', function(csvdata) {
    var data = [[], [], []];
    $.each($.csv.toArrays(csvdata, { start: 2 }),
      function(ri, v) {
        var g = v[0].split('-');
        var d = new Date(g[0], g[1] - 1, g[2]).getTime();

        for (var i = 1; i < v.length; ++i) {
          data[i - 1].push([d, v[i]]);
        }
      });

    gChartData = [
      {
        label: "Flash 10.2 and below",
        data: data[0],
        showLabels: true,
        labels: labelsForData(data[0], kLabels[0]),
      },
      {
        label: "Flash 10.3 to 10.3.183.67",
        data: data[1],
        showLabels: true,
        labels: labelsForData(data[1], kLabels[1]),
      },
      {
        label: "Flash 11.0 to 11.2.202.275",
        data: data[2],
        showLabels: true,
        labels: labelsForData(data[2], kLabels[2]),
      },
    ];
    doPlot();
  });
}
$(go);

function doPlot()
{
  var stacked = $('#stackCheck').prop('checked');
  $.plot($('#chart'), gChartData, {
    canvas: true,
    series: {
      stack: stacked,
      labelPlacement: "above",
      canvasRender: true,
      cPadding: 6,
      cFont: "12px sans-serif",
      points: {
        show: true,
        radius: 1,
      },
      lines: {
        show: true,
        fill: stacked,
      },
    },
    xaxis: {
      mode: "time",
      timezone: "browser",
      color: "#333",
      ticks: allMondays,
      dateFormat: 'yy-MMM-d',
      tickColor: "#ddd",
    },
    yaxis: {
      axisLabelPadding: 5,
      axisLabel: "% of Total Flash users (Telemetry)",
      color: "#333",
      tickColor: "#ddd",
    },
    grid: {
      markings: weekendAreas,
      color: "#333",
    },
  });
}
$('#stackCheck').on('change', doPlot);