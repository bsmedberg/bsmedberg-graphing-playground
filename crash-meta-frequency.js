var kOrdering = [
  'Windows NT',
  'Mac OS X',
  'Linux',
  'FennecAndroid',
];

var gParseRE = /^\('([^']*)', '([^']*)', '([^']*)'\)$/;

function go() {
  loadData(null, 'text', function(data) {
    var platforms = {};
    var allkeys = {};

    function getPlatform(os) {
      if (!(os in platforms)) {
        platforms[os] = {};
      }
      return platforms[os];
    }

    $.each($.csv.toArrays(data, { separator: '\t' }),
           function(i, v) {
             var m = gParseRE.exec(v[0]);
             if (m == null) {
               console.log("Error parsing " + v[0]);
               return;
             }
             var product = m[1];
             var os = m[2];
             var key = m[3];
             var total = parseInt(v[1]);

             if (product == 'Fennec' && os == 'Android') {
               os = 'FennecAndroid';
             }
             else if (product != 'Firefox') {
               return;
             }
             getPlatform(os)[key] = total;
             allkeys[key] = true;
           });

    delete allkeys.$total;
    delete allkeys.legacy_processing;

    allkeys = Object.keys(allkeys);

    var mainplatform = platforms['Windows NT'];
    allkeys.sort(function(a, b) {
      var va = mainplatform[a];
      if (va === undefined) {
        va = 0;
      }
      var vb = mainplatform[b];
      if (vb === undefined) {
        vb = 0;
      }
      return va - vb;
    });

    $('#chart').height(allkeys.length * 12);

    var categories = [];
    $.each(allkeys, function(i, key) {
      categories.push([i, key]);
    });
    
    var chartdata = []
    $.each(kOrdering, function(i, os) {
      var osdata = platforms[os];
      var gtotal = osdata.$total;
      var oschart = [];
      $.each(allkeys, function(ki, key) {
        if (!(key in osdata)) {
          return;
        }
        var pct = osdata[key] / gtotal * 100;
        oschart.push([pct, ki]);
      });
      chartdata.unshift({ label: os, data: oschart, bars: { order: null } });
    });

    gChartData = chartdata;

    $.plot($('#chart'), chartdata, {
      canvas: false,
      legend: {
        labelBoxBorderColor: '#222',
        position: "nw",
      },
      series: {
        points: {
          show: true,
        },
        bars: {
          lineWidth: 0,
          barWidth: 0.5,
          horizontal: true,
          show: true,
          fill: true,
          align: "right",
        },
      },
      xaxis: {
        position: "top",
        min: 0,
        max: 101,
        ticks: [25, 50, 75, 100],
        tickFormatter: function(f) { return f + "%"; },
      },
      yaxis: {
        tickLength: 0,
        min: -0.5,
        max: allkeys.length + 0.5,
        tickSize: 1,
        ticks: categories,
      },
    });
  });
};

$(go);

