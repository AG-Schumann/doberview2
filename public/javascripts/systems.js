var sensors = [];
var units = {};
var properties = [];
var linktargets = {};
var intervalid = 0;
var pipelineconfigs = {};

const TOGGLE_SLIDER_FRACTIONAL_HEIGHT = 0.8;

function PopulateNavbar() {
  // Add rate selector to navigation bar
  var allowedrates = [1, 2, 5, 10, 30];
  var content = '<li class="nav-item"><div class="nav-item dropdown">';
  content += '<a class="nav-link dropdown-toggle" data-bs-toggle="dropdown" href="#" role="button">';
  content += 'Refresh <span id="currentrefreshrate"></span></a>';
  content += '<ul id="refresh_rate_list" class="dropdown-menu" data-bs-popper="none">';
  for (const rate of allowedrates) {
    content += `<li><a class="dropdown-item" role="button" onclick="SetRefreshRate(${rate})">${rate} s</a></li>`
  }
  content += '</ul></div></li>';

  // Add test alarm to navigation bar
  var alarmlevels = [0, 1, 2];
  content += '<li class="nav-item"><div class="nav-item dropdown">';
  content += '<a class="nav-link dropdown-toggle" data-bs-toggle="dropdown" href="#" role="button">Test alarm</a>';
  content += '<ul id="test_alarm_level_list" class="dropdown-menu" data-bs-popper="none">';
  for (const level of alarmlevels) {
    content += `<li><a class="dropdown-item" role="button" onclick="DeviceCommand('pl_alarm', 'testalarm ${level}')">Level ${level}</a></li>`
  }
  content += '</ul></div></li>';

  $('#navbar_content').prepend(content);
}

function SetRefreshRate(rate) {
  if (intervalid != 0)
    clearInterval(intervalid);
  intervalid = setInterval(UpdateOnce, rate * 1000);
  document.querySelector('#currentrefreshrate').innerHTML = rate + ' s';
}

function SigFigs(val) {
  LOG_THRESHOLD=3;
  SIG_FIGS=3;
  return Math.abs(Math.log10(Math.abs(val))) < LOG_THRESHOLD ? val.toPrecision(SIG_FIGS) : val.toExponential(SIG_FIGS-1);
}

function GetAttributeOrDefault(element, attribute, deflt) {
  if (element.hasAttribute(attribute))
    return element.getAttribute(attribute);
  else
    return deflt;
}

function TogglePipelineConfig(e){
  var element = e.target;
  var pipeline = element.getAttribute('pipeline');
  var target = element.getAttribute('target');
  var value = 1 - parseInt(element.getAttribute('state'));
  $.post('/pipeline/set_single_node_config',
         data={pipeline: pipeline, target: target, value: value},
         data => {
           if (typeof data != 'undefined' && typeof data.err != 'undefined')
            alert(data.err);
          else {
            $("#pipelinebox").modal('hide');
            Notify(data.notify_msg, data.notify_status);
          }
  });

}

function Setup(){
  console.log('Setting up fields');
  var doc = document.querySelector('object#svg_frame').getSVGDocument();
 
  var regex = /(?<=^sensorbox_)[^\-]+/; 
  for (var sensorbox of doc.querySelectorAll('[id^=sensorbox_]')) {
    var sensor = sensorbox.getAttribute('id').match(regex)[0];
    var suffix = `-${Math.floor(Math.random() * 10000)}`;
    // Add a description box for the sensor
    var descbox = doc.createElementNS("http://www.w3.org/2000/svg", 'text');
    descbox.id = `descbox_${sensor}-${suffix}`;
    fontsize = sensorbox.getAttribute('height') / 4;
    descbox.setAttribute('x', parseFloat(sensorbox.getAttribute('x')) + 1);
    descbox.setAttribute('y', parseFloat(sensorbox.getAttribute('y')) + fontsize + 0.5);
    descbox.textContent = `${sensor} (UNITS)`;
    descbox.style.fontFamily = 'sans-serif';
    descbox.style.fontSize = `${fontsize}px`;
    sensorbox.parentElement.appendChild(descbox);

    // Add the value box
    var valbox = doc.createElementNS("http://www.w3.org/2000/svg", 'text');
    valbox.id = `value_${sensor}-${suffix}`;
    fontsize = sensorbox.getAttribute('height') / 2;
    valbox.setAttribute('x', parseFloat(sensorbox.getAttribute('x')) + 1);
    valbox.setAttribute('y', parseFloat(sensorbox.getAttribute('y')) + fontsize*2 - 3);
    valbox.textContent = `${sensor}`;
    valbox.style.fontFamily = 'sans-serif';
    valbox.style.fontSize = `${fontsize}px`;
    sensorbox.parentElement.appendChild(valbox);

  }

  // Get a full list of sensors which will need updating
  regex = /(?<=(val[uv]e|sensdet)_)[^\-]+/; // Extract what comes after value or valve before -
  var vals = doc.querySelectorAll('[id^=value_], [id^=valve_], [id*=sensdet_]');
  sensors = new Set(Array.from(vals, n => n.getAttribute('id').match(regex)[0]));

  var metadata = doc.querySelector('metadata');
  properties = [];
  for (var property of metadata.getElementsByTagName('property')) {
    properties.push({
        'sensor': property.getAttribute('sensor'),
        'targetId': property.getAttribute('targetId'),
        'targetAttribute': property.getAttribute('targetAttribute'),
        'scaling': parseFloat(GetAttributeOrDefault(property, 'scaling', 1)),
        'offset': parseFloat(GetAttributeOrDefault(property, 'offset', 0)),
        'min': parseFloat(GetAttributeOrDefault(property, 'min', -Infinity)),
        'max': parseFloat(GetAttributeOrDefault(property, 'max', Infinity)),
    });
    sensors.add(property.getAttribute('sensor'));
  }
  sensors.forEach(s => $.getJSON(`/devices/sensor_detail?sensor=${s}`, data => {
    units[s] = data.units;
    for (var element of doc.querySelectorAll(`[id*=_${s}]`)) {
      element.addEventListener('click', function() {SensorDropdown(s);});
      element.style['cursor'] = 'pointer';
    }
    for (var element of doc.querySelectorAll(`[id^=descbox_${s}]`)) {
      element.textContent = `${s} (${units[s]})`;
    }
  }));

  // Check for links
  regex = /(?<=^link_)[^\-]+/;
  for (var element of doc.querySelectorAll(`[id^=link_]`)) {
    linktargets[element.id] = element.getAttribute('id').match(regex)[0];
    element.addEventListener('click', LoadSVG);
    element.style['cursor'] = 'pointer';
  }

  // Check for pipeline interaction elements
  for (var element of doc.querySelectorAll('.pipeline_config_toggle')) {
    var tbwidth = parseFloat(element.getAttribute('width'));
    var tbheight = parseFloat(element.getAttribute('height'));
    var tbx = parseFloat(element.getAttribute('x'));
    var tby = parseFloat(element.getAttribute('y'));
    var tbpipeline = element.getAttribute('pipeline');
    var tbtarget = element.getAttribute('target');
    var toggle = doc.createElementNS("http://www.w3.org/2000/svg", 'circle');
    toggle.setAttribute('r', tbheight * TOGGLE_SLIDER_FRACTIONAL_HEIGHT / 2);
    toggle.setAttribute('cx', tbx + tbheight / 2);
    toggle.setAttribute('cy', tby + tbheight / 2);
    toggle.setAttribute('class', 'pipeline_toggler');
    toggle.setAttribute('pipeline', tbpipeline);
    toggle.setAttribute('target', tbtarget);
    toggle.setAttribute('slideby', tbwidth - tbheight);
    toggle.setAttribute('state', 0);
    toggle.style.strokeWidth = 1;
    toggle.style.fill = '#ff0000';
    toggle.onclick = TogglePipelineConfig;
    element.parentElement.appendChild(toggle);
    if (!pipelineconfigs[tbpipeline]) pipelineconfigs[tbpipeline] = [];
    pipelineconfigs[tbpipeline].push(tbtarget);
  }
  UpdateOnce();
}

function LoadSVG(fn) {
  try {
    // Need to determine new SVG based on event target
    // unless fn is already a string, then get exception
    fn = linktargets[fn.currentTarget.id];
  } catch (e) {
    // Was probably a string. Do nothing.
  }
  //if (typeof fn != 'undefined') {
  var current_fn = $("#svg_frame").attr('data');
  var p = current_fn.split('/');
  if (fn.slice(-4) != '.svg')
    fn = `${fn}.svg`;
  p[p.length-1] = fn;
  fn = p.join('/');
  $("#svg_frame").attr('data', fn);
  //}
  console.log(`Loading ${$("#svg_frame").attr('data')}`);
}

function UpdateOnce() {
  var doc = document.getElementById('svg_frame').getSVGDocument();
  $.getJSON(`/devices/get_last_points?sensors=${[...sensors].join(',')}`, data => {
    sensors.forEach(s => {
      if (!data[s]) {
        console.log(`No data for sensor ${s}`);
        return;
      }
      var value = parseFloat(data[s]['value']);
      for (var element of doc.querySelectorAll(`[id^=valve_${s}]`)) {
        element.classList.remove(value ? 'off' : "on");
        element.classList.add(value ? 'on' : 'off');
      }
      for (var element of doc.querySelectorAll(`[id^=value_${s}]`)) {
        element.innerHTML = `${SigFigs(value)}`.replace('-', '\u2212');
      }
      for (var property of properties) {
        if (property['sensor'] == s) {
          var transformedValue = value * property['scaling'] + property['offset'];
          transformedValue = Math.max(transformedValue, property['min']);
          transformedValue = Math.min(transformedValue, property['max']);
          var target = doc.getElementById(property['targetId']);
          target.setAttribute(property['targetAttribute'], transformedValue);
        }
      }
    });
  });

  $.post('/pipeline/get_pipelines_configs',
         data={pipelines: pipelineconfigs},
         resp => {
    doc.querySelectorAll('.pipeline_toggler').forEach(e => {
      var state = parseInt(e.getAttribute('state'));
      var newstate = parseInt(resp[e.getAttribute('pipeline')][e.getAttribute('target')]);
      var newfill = newstate ? '#009900' : '#990000';
      var newx = parseFloat(e.getAttribute('cx')) + parseFloat(e.getAttribute('slideby')) * (newstate-state);
      e.style.fill = newfill;
      e.setAttribute('cx', newx);
      e.setAttribute('state', newstate);
    });
  });
}
