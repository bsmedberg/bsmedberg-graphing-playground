var gData;

function MemoryInfo(list)
{
  // For reasons that must have something to do with accidentally
  // sign-extending int which should be unsigned, ignore values larger than
  // 32-bits for BaseAddress/AllocationBase

  this.BaseAddress = BigInteger.parse(list[0].slice(-8), 16);
  this.AllocationBase = BigInteger.parse(list[1].slice(-8), 16);
  this.AllocationProtect = parseInt(list[2], 16);
  this.RegionSize = parseInt(list[3], 16);
  this.State = parseInt(list[4], 16);
  this.Protect = parseInt(list[5], 16);
  this.Type = parseInt(list[6], 16);
}
MemoryInfo.prototype.toString = function meminfo_toString() {
  return [this.BaseAddress, this.AllocationBase, this.AllocationProtect,
          this.RegionSize, this.State, this.Protect, this.Type].join(',');
};
MemoryInfo.prototype.getPage = function meminfo_getPage() {
  return this.BaseAddress.divide(gPageSize).toJSValue();
}
MemoryInfo.prototype.getPageCount = function meminfo_getPageCount() {
  return this.RegionSize / gPageSize;
}
MemoryInfo.prototype.containsPage = function meminfo_containsPage(page) {
  var startPage = this.getPage();
  var endPage = startPage + this.getPageCount();

  return page >= startPage && page < endPage;
}

function makeMemoryInfo(value, state)
{
  return new MemoryInfo(value);
}

$(function doit() {
  loadData(null, 'text', function(data) {
    gData = $.csv.toArrays(data, {start: 2, separator: '\t', onParseEntry: makeMemoryInfo });
    setup();
  });
});

// Assume 32-bit windows for now
var gPageSize = 0x1000;
var gNumPages = BigInteger('0xFFFFFFFF').divide(gPageSize).toJSValue();

var gCommitColor = '#221d6b';
var gReserveColor = '#cca633';


var gLargest = BigInteger(0);

function checkLargest(blocksize) {
  if (blocksize.compare(gLargest) > 0) {
    gLargest = blocksize;
  }
}

function verifySequential()
{
  var end = BigInteger(0);
  var lastAvailable = BigInteger(0);

  for (var i = 0; i < gData.length; ++i) {
    var cur = gData[i];
    if (!cur.BaseAddress.remainder(gPageSize).isZero()) {
      throw new Error("Non-page allocation base at address " + cur.BaseAddress.toString(16));
    }
    if ((cur.RegionSize % gPageSize) != 0) {
      throw new Error("Non-page region size at address " + cur.BaseAddress.toString(16));
    }
    if (end.compare(cur.BaseAddress) > 0) {
      throw new Error("Non-sequential allocation at address " + cur.BaseAddress.toString(16));
    }
    end = cur.BaseAddress.add(cur.RegionSize);
    if (cur.State == 0x10000) { // MEM_FREE
      checkLargest(end.subtract(lastAvailable));
    }
    else {
      lastAvailable = end;
    }
  }
  if (end.compare(BigInteger('0xFFFFFFFF')) > 0) {
    throw new Error("Address end beyond 32-bit address space: " + end.toString(16));
  }
  $('#largestrange').text("0x" + gLargest.toString(16));
}

function setup()
{
  verifySequential();

  redraw();
}

var gPixelSize;
var gPagesPerRow;
var gRowCount;
var gRedrawPending = false;

function redraw() {
  gRedrawPending = false;
  $('#overlay').hide();

  gPixelSize = parseInt($('#selectPixelSize').val());
  var canvasWidth = $('#c').width();

  gPagesPerRow = Math.floor(canvasWidth / gPixelSize);
  // Make gPagesPerRow a multiple of 8 because that's the Windows allocation
  // block size.
  gPagesPerRow -= gPagesPerRow % 16;
  gRowCount = Math.ceil(gNumPages / gPagesPerRow);

  var height = gRowCount * gPixelSize;
  $('#c').attr('width', canvasWidth).attr('height', height);
  var cx = $('#c')[0].getContext('2d');

  cx.fillStyle = 'white';
  cx.fillRect(0, 0, canvasWidth, height);

  function fillPage(pageNum)
  {
    var row = Math.floor(pageNum / gPagesPerRow);
    var col = pageNum % gPagesPerRow;

    cx.fillRect(col * gPixelSize, row * gPixelSize, gPixelSize, gPixelSize);
  }

  $.each(gData, function(i, v) {
    var page = v.getPage();
    var pageCount = v.getPageCount();
    var endPage = page + pageCount;

    var color;
    switch (v.State) {
    case 0x10000: // MEM_FREE
      return;
    case 0x1000: // MEM_COMMIT
      color = gCommitColor;
      break;
    case 0x2000: // MEM_RESERVE
      color = gReserveColor;
      break;
    default:
      color = 'red';
    }
    cx.fillStyle = color;
    for (; page < endPage; ++page) {
      fillPage(page);
    }
  });
}

function getDisplayState(state)
{
  switch (state) {
  case 0x1000:
    return "MEM_COMMIT";
  case 0x10000:
    return "MEM_FREE";
  case 0x2000:
    return "MEM_RESERVE";
  }
  return state.toString(16);
}

var PAGE_GUARD = 0x100;
var PAGE_NOCACHE = 0x200;
var PAGE_WRITECOMBINE = 0x400;

function getDisplayProtection(protection)
{
  var m = [];
  if (protection & PAGE_GUARD) {
    m.push('PAGE_GUARD');
    protection &= ~PAGE_GUARD;
  }
  if (protection & PAGE_NOCACHE) {
    m.push('PAGE_NOCACHE');
    protection &= ~PAGE_NOCACHE;
  }
  if (protection & PAGE_WRITECOMBINE) {
    m.push('PAGE_WRITECOMBINE');
    protection &= ~PAGE_WRITECOMBINE;
  }
  var r;
  switch (protection) {
  case 0x10:
    r = "PAGE_EXECUTE";
    break;
  case 0x20:
    r = "PAGE_EXECUTE_READ";
    break;
  case 0x40:
    r = "PAGE_EXECUTE_READWRITE";
    break;
  case 0x80:
    r = "PAGE_EXECUTE_WRITECOPY";
    break;
  case 0x01:
    r = "PAGE_NOACCESS";
    break;
  case 0x02:
    r = "PAGE_READONLY";
    break;
  case 0x04:
    r = "PAGE_READWRITE";
    break;
  case 0x08:
    r = "PAGE_WRITECOPY";
    break;
  default:
    r = protection.toString(16);
  }
  return r + " " + m.join(' | ');
}

function getDisplayType(type)
{
  switch (type) {
  case 0x1000000:
    return "MEM_IMAGE";
  case 0x40000:
    return "MEM_MAPPED";
  case 0x20000:
    return "MEM_PRIVATE";
  }
  return type.toString(16);
}

function getDataForPage(p)
{
  console.log("Looking for page", p);
  for (var i = 0; i < gData.length; ++i) {
    var d = gData[i];
    if (d.containsPage(p)) {
      console.log("Found Data", i);
      return d;
    }
  }
  return null;
}

$('#c').on('mousemove', function(e) {
  var thisx = e.pageX - this.offsetLeft;
  var thisy = e.pageY - this.offsetTop;

  var col = Math.floor(thisx / gPixelSize);
  var row = Math.floor(thisy / gPixelSize);
  var page = row * gPagesPerRow + col;

  var mi = getDataForPage(page);
  if (mi === null) {
    $("#overlay").hide();
    return;
  }

  $('#infoaddress').text("0x" + mi.BaseAddress.toString(16));
  $('#infosize').text("0x" + mi.RegionSize.toString(16));
  $('#infostate').text(getDisplayState(mi.State));
  $('#infoprotection').text(getDisplayProtection(mi.Protect));
  $('#infotype').text(getDisplayType(mi.Type));
  $('#overlay').offset({left: e.pageX + 5, top: e.pageY + 5}).show();
});

$('#c').on('mouseout', function(e) {
  $('#overlay').hide();
});

$('#selectPixelSize').on('change', redraw);

$(window).on('resize', function() {
  if (!gRedrawPending) {
    gRedrawPending = true;
    setTimeout(redraw, 100);
  }
});
