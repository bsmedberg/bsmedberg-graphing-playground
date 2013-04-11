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
