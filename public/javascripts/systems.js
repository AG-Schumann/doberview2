var sensors = [];
var valves = [];
var setpoints = [];
var units = {};

function SigFigs(val) {
  LOG_THRESHOLD=3;
  SIG_FIGS=3;
  return Math.abs(Math.log10(Math.abs(val))) < LOG_THRESHOLD ? val.toFixed(SIG_FIGS) : val.toExponential(SIG_FIGS);
}

function Setup(){
  var doc = document.getElementById('svg_frame').getSVGDocument();
  var metadata = doc.all[1];
  sensors = metadata.children[0].innerHTML.split(' ');
  setpoints = metadata.children[1].innerHTML.split(' ');
  valves = metadata.children[2].innerHTML.split(' ');
  links = metadata.children[3].innerHTML.split(' ');
  if (setpoints.length == 1 && setpoints[0] === '')
    setpoints = [];
  if (valves.length == 1 && valves[0] === '')
    valves = [];
  sensors.forEach(s => $.getJSON(`/devices/sensor_detail?sensor=${s}`, data => {
    units[s] = data.units;
    doc.getElementById(`value_${s}`).addEventListener('click', function() {SensorDropdown(s);});
  }));
  UpdateOnce();
}

function LoadSVG(fn) {
  if (typeof fn != 'undefined') {
    var current_fn = $("#svg_frame").attr('data');
    var p = current_fn.split('/');
    if (fn.slice(-4) != '.svg')
      fn = `${fn}.svg`;
    p[p.length-1] = fn;
    fn = p.join('/');
    $("#svg_frame").attr('data', fn);
  } else {
  }
  console.log(`Loading ${$("#svg_frame").attr('data')}`);
  setTimeout(() => {
    // this is jank but not sure how else to do this
    Setup();
    console.log('Setup?');
  }, 500); // if loading takes more than 500ms then increase
}

function UpdateOnce() {
  var doc = document.getElementById('svg_frame').getSVGDocument();
  sensors.forEach(s => {
    $.getJSON(`/devices/get_last_point?sensor=${s}`, data => {
      if (valves.includes(s)) {
        var elements = doc.querySelectorAll(`[id^=valve_${s}]`);
        for (var element of elements) {
          element.classList.remove(data.value ? 'off' : "on");
          element.classList.add(data.value ? 'on' : 'off');
        }
      } else {
        doc.getElementById(`value_${s}`).innerHTML = `${SigFigs(data.value)} ${units[s]}`;
      }
    });
  });
}

