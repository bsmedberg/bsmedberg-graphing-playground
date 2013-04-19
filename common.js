var kMSPerDay = 24 * 60 * 60 * 1000;

function loadData(url, type, callback)
{
  if (url == null) {
    url = $('#datalink').attr('href');
  }

  $.ajax(url, {
    dataType: type,
    error: function() { alert("Error retreiving data: " + url); },
    success: callback,
  });
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

function allMondays(axis) {
  var d = new Date(axis.min);
  var format = axis.dateFormat;
  if (format === undefined) {
    format = 'yyyy/M/d';
  }

  // go to the first Monday
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  d.setSeconds(0);
  d.setMinutes(0);
  d.setHours(0);

  var ticks = [];

  var i = d.getTime();
  do {
    ticks.push([i, $.format.date(new Date(i), format)]);
    i += 7 * kMSPerDay;
  } while (i < axis.max);

  return ticks;
}
