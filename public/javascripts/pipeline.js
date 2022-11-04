function PopulateNavbar() {
  var content = '<li><div class="d-flex"><div class="dropdown">' +
      '<button class="btn btn-primary dropdown-toggle" type="button" data-bs-toggle="dropdown">' +
      '<span>Add new &nbsp<i class="fas fa-solid fa-plus"></i><i class="fas fa-code-branch"></i></span></button>' +
      '<ul class="dropdown-menu">'
  for(var flavor of ['alarm', 'control', 'convert']) {
    content += '<li><a class="dropdown-item" onclick=NewPipelineDropdown("'+ flavor +'")> New '  + flavor + ' pipeline</a></li>'
  }
  content += '</ul></div></div></li><li><div class="d-flex"><div class="input-group"><span class="input-group-text">' +
      '<i class="fas fa-solid fa-magnifying-glass"></i></span>' +
      '<input class="form-control" id="searchPipelineInput" type="text" onkeyup="PopulatePipelines()" placeholder="Search pipelines">' +
      '<button class="btn bg-transparent" type="button" style="margin-left: -40px; z-index: 100;" onclick="$(`#searchPipelineInput`).val(``); PopulatePipelines();">' +
      '<i class="fa fa-times"></i></button></div></div></li>';
  $('#navbar_content').html(content);
}

function UpdateLoop() {
  $(".tooltip").tooltip("hide");
  ['alarm', 'control', 'convert'].forEach(flavor => PopulatePipelines(flavor));
}

function PopulatePipelines(flavor) {
  var filter = $("#searchPipelineInput").val().toUpperCase();
  var silent = 'fas fa-bell-slash';
  var active = 'fas fa-bell';
  var restart = "fas fa-angle-double-left";
  $.getJSON(`/pipeline/get_pipelines?flavor=${flavor}`, data => {
    $(`#${flavor}_active`).empty();
    $(`#${flavor}_silent`).empty();
    $(`#${flavor}_inactive`).empty();
    data.forEach(doc => {
      let n = doc.name;
      let status = doc.status;
      let last_error = doc.cycle - doc.error; // last error X cycles ago
      let status_color = ((last_error < 5) ? 'danger' : 'success');
      if(doc.cycle === 0) status_color = 'secondary' // status indicator grey when pipeline never ran
      $(`#${flavor}_${status}`).append(`<tr><td onclick="PipelineDropdown('${n}')">` +
          `<span class="badge p-2 bg-${status_color} rounded-circle"><span class="visually-hidden">X</span></span></td>` +
          `<td onclick="PipelineDropdown('${n}')">${n}</td>` +
          `<td id="${n}_description" onclick="PipelineDropdown('${n}')">Loading</td>` +
          `<td id="${n}_actions">Loading</td></tr>`);
      if (flavor == 'alarm') {
        let alarm_name = n.split(/_(.*)/s)[1]; // get name of alarm without 'alarm_'
        $.getJSON(`/devices/sensor_list`, sensor_list => {
          if (sensor_list.includes(alarm_name)) {
            $.getJSON(`sensor_detail?sensor=${alarm_name}`, sensor_detail => {
              $(`#${n}_description`).html(`${sensor_detail.description}`);
            });
          } else {
            $(`#${n}_description`).html(`${doc.description}`);
          }
        });
      } else {
        $(`#${n}_description`).html(`${doc.description}`);
      }
      let stop_button = `<button class="btn btn-danger action_button" onclick="PipelineControl('stop','${n}')"><i class="fas fa-solid fa-stop"></i>Stop</button>`;
      let silence_button = `<button class="btn btn-secondary action_button" onclick="SilenceDropdown('${n}')"><i class="fas fa-solid fa-bell-slash"></i>Silence</button>`;
      let activate_button = `<button class="btn btn-success action_button" onclick="PipelineControl('active','${n}')"><i class="fas fa-solid fa-bell"></i>Activate</button>`;
      let restart_button = `<button class="btn btn-primary action_button" onclick="PipelineControl('restart','${n}')"><i class="fas fa-solid fa-rotate"></i> Restart</button>`;
      let start_button = `<button class="btn btn-success action_button" onclick="StartPipeline('${n}')"><i class="fas fa-solid fa-play"></i> Start</button>`;
      if (status === 'active') {
        $(`#${n}_actions`).html(`${silence_button}${stop_button}${restart_button}`);
      } else if (status === 'silent') {
        $(`#${n}_actions`).html(`${activate_button}${stop_button}${restart_button}`);
      } else {
        $(`#${n}_actions`).html(`${start_button}`);
      }
    }); // data.forEach
  }); // getJSON
}

function Visualize(doc) {
  if (doc == null) {
    try{
      doc = JSON.parse(JSON.stringify(document.jsoneditor.get()));
    }catch(err){alert(err); return;}
  }
  var data = [];
  doc.pipeline.forEach(item => {(item.upstream || []).forEach(us =>
    data.push({from: us, to: item.name, id: us, name: us}));});
  var nodes = doc.pipeline.map(item => ({id: item.name, name: item.name, title: item.type}));
  Highcharts.chart('pipeline_vis', {
    chart: {
      height: 'auto',
      inverted: true,
      title: null,
    },
    title: {text: null},
    credits: {enabled: false},

    series: [{
      type: 'organization',
      name: doc.name,
      keys: ['from', 'to'],
      data: data,
      animation: {duration: 100},
    }],
    levels: [],
    nodes: nodes,
  });
}

function SilenceDropdown(name) {
  $('#silence_me').html(name);
  $('#silence_dropdown').modal('show');
}

function AlarmTemplate() {
  return {
    name: 'alarm_NAME',
    pipeline: [
      {
        name: 'source_NAME',
        type: 'DeviceRespondingInfluxNode',
        input_var: 'SENSOR'
      },
      {
        name: 'alarm_NAME',
        type: 'SimpleAlarmNode',
        input_var: 'SENSOR',
        upstream: ['source_NAME']
      }
    ],
    node_config: {}
  };
}

function ControlTemplate() {
  return {
    name: 'control_NAME',
    pipeline: [
      {
        name: 'source_A',
        type: 'SensorSourceNode',
        input_var: 'SENSOR_A'
      },
      {
        name: 'source_B',
        type: 'SensorSourceNode',
        input_var: 'SENSOR_B'
      },
      {
        name: 'merge',
        type: 'MergeNode',
        input_var: null,
        upstream: ['source_A', 'source_B']
      },
      {
        name: 'eval_low',
        type: 'EvalNode',
        input_var: ['SENSOR_A', 'SENSOR_B'],
        upstream: ['merge'],
        operation: 'OPERATION',
        output_var: 'condition_a'
      },
      {
        name: 'eval_high',
        type: 'EvalNode',
        input_var: ['SENSOR_A', 'SENSOR_B'],
        upstream: ['eval_low'],
        operation: 'OPERATION',
        output_var: 'condition_b'
      },
      {
        name: 'control',
        type: 'DigitalControlNode',
        upstream: ['eval_high'],
        input_var: null
      }
    ],
    node_config: {
      general: {
        default_output: null,
        output_a: 1,
        output_b: 0
      }
    }
  };
}

function ConvertTemplate() {
  return {
    name: 'convert_NAME',
    pipeline: [
      {
        name: 'source_NAME',
        type: 'SensorSourceNode',
        input_var: 'SENSOR'
      },
      {
        name: 'rate',
        type: 'DerivativeNode',
        input_var: 'SENSOR',
        upstream: ['source_NAME'],
        output_var: 'SENSOR_rate'
      },
      {
        name: 'scale',
        type: 'PolynomialNode',
        input_var: 'SENSOR_rate',
        output_var: 'SENSOR',
        upstream: ['rate']
      },
      {
        name: 'sink',
        type: 'InfluxSinkNode',
        input_var: 'SENSOR',
        output_var: 'SENSOR',
        upstream: ['scale']
      }
    ],
    node_config: {
      rate: {
        length: 5
      },
      scale: {
        transform: [0,1]
      }
    }
  };
}

function ValidatePipeline(echo=true) {
  try{
    doc = JSON.parse(JSON.stringify(document.jsoneditor.get()));
  }catch(err){
    Notify(err, 'error');
    return false;
  }
  if (!(doc.name.startsWith('alarm') || doc.name.startsWith('control') || doc.name.startsWith('convert'))) {
    Notify('Please provide a conforming pipeline name', 'error');
    return false;
  }
  var names = [];
  var flavor = null;
  for (var node of doc.pipeline) {
    if (names.includes(node.name)) {
      Notify('Please give nodes unique names', 'error');
      return false;
    }
    if (node.name.includes('NAME')) {
      Notify('Please give nodes meaningful names', 'error');
      return false;
    }
    if (flavor == null) {
      if (node.type.includes('Alarm'))
        flavor = 'alarm';
      else if (node.type.includes('Control'))
        flavor = 'control';
      else if (node.type == 'InfluxSinkNode')
        flavor = 'convert';
    }
    names.push(node.name);
  }
  if (!doc.name.startsWith(flavor)) {
    Notify('The name doesn\'t seem to match the pipeline\'s task', 'error');
    return false;
  }
  if (echo)
    Notify('Basic validation successful');
  return true;
}

function FillTemplate(which) {
  var doc = which == 'alarm' ? AlarmTemplate() : which == 'control' ? ControlTemplate() : ConvertTemplate();
  document.jsoneditor.set(doc);
  Visualize(doc);
}

function AddOrUpdatePipeline() {
  if (ValidatePipeline(false)) {
    var doc = JSON.parse(JSON.stringify(document.jsoneditor.get()));
    if (typeof doc._id != 'undefined')
      delete doc._id;
    $.ajax({
      type: 'POST',
      url: "/pipeline/add_pipeline",
      data: doc,
      success: (data) => {
        if (typeof data != 'undefined' && typeof data.err != 'undefined')
          alert(data.err);
        else {
          $("#pipelinebox").modal('hide');
          Notify(data.notify_msg, data.notify_status);
        }
      },
      error: (jqXHR, textStatus, errorCode) => alert(`Error: ${textStatus}, ${errorCode}`),
    });
  }
}


function DeletePipeline() {
  var name;
  try {
    name = JSON.parse(JSON.stringify(document.jsoneditor.get())).name;
  }catch(err){alert(err); return;}

  if (confirm(`Are you sure that you want to delete this pipeline?`)) {
    $.ajax({
      type: 'POST',
      url: '/pipeline/delete_pipeline',
      data: {pipeline: name},
      success: (data) => {
        if (typeof data != 'undefined' && typeof data.err != 'undefined')
          alert(data.err);
        else
          $("#pipelinebox").modal('hide');
          Notify(data.notify_msg, data.notify_status);
      },
      error: (jqXHR, textStatus, errorCode) => alert(`Error: ${textStatus}, ${errorCode}`),
    });
  }
}

function StartPipeline(name) {
  PipelineControl('start', name);
}

function SilencePipeline(duration) {
  var name = $("#silence_me").html();
  $.ajax({
    type: 'POST',
    url: "/pipeline/pipeline_silence",
    data: {name: name, duration: duration},
    success: (data) => {
      if (typeof data != 'undefined' && typeof data.err != 'undefined')
        alert(data.err);
      else
        $("#silence_dropdown").modal('hide');
        PopulatePipelines();
        Notify(data.notify_msg, data.notify_status);
    },
    error: (jqXHR, textStatus, errorCode) => alert(`Error: ${textStatus}, ${errorCode}`),
  });
}

function PipelineControl(action, pipeline) {
  $.ajax({
    type: 'POST',
    url: "/pipeline/pipeline_ctl",
    data: {cmd: action, name: pipeline},
    success: (data) => {
      if (typeof data != 'undefined' && typeof data.err != 'undefined')
        alert(data.err);
      $('.modal').modal('hide');
      PopulatePipelines();
      Notify(data.notify_msg, data.notify_status);
    },
    error: (jqXHR, textStatus, errorCode) => alert(`Error: ${textStatus}, ${errorCode}`),
  });
}

function NewPipelineDropdown(flavor) {
  FillTemplate(flavor);
  $("#detail_pipeline_name").html(`New ${flavor} pipeline`);
  $('#pipelinebox').modal('show');
}

function PipelineDropdown(pipeline) {
  $.getJSON(`/pipeline/get_pipeline?name=${pipeline}`, doc => {
    $("#detail_pipeline_name").html(doc.name);
    Visualize(doc);
    document.jsoneditor.set(doc);
  });
  $('#pipelinebox').modal('show');
}
