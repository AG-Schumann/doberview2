function PopulateNavbar() {
  let content = '<li><div class="d-flex"><div class="dropdown">' +
      '<button class="btn btn-primary dropdown-toggle" type="button" data-bs-toggle="dropdown">' +
      '<span>Add new &nbsp<i class="fas fa-solid fa-plus"></i><i class="fas fa-code-branch"></i></span></button>' +
      '<ul class="dropdown-menu">';
  for(let flavor of ['alarm', 'control', 'convert']) {
    content += '<li><a class="dropdown-item" onclick=NewPipelineDropdown("'+ flavor +'")> New ' + flavor + ' pipeline</a></li>'
  }
  content += '</ul></div></div></li><li class="nav-item"><div class="d-flex"><div class="input-group"><span class="input-group-text">' +
      '<i class="fas fa-solid fa-magnifying-glass"></i></span>' +
      '<input class="form-control" id="searchPipelineInput" type="text" onkeyup="UpdateLoop()" placeholder="Search pipelines">' +
      '<button id="clear_search_btn" class="btn bg-transparent" type="button"  onclick="$(`#searchPipelineInput`).val(``); PopulatePipelines();">' +
      '<i class="fa fa-times"></i></button></div></div></li>';
  $('#navbar_content').prepend(content);
}

function UpdateLoop() {
  $('[data-bs-toggle="tooltip"]').tooltip('dispose');
  ['alarm', 'control', 'convert'].forEach(flavor => PopulatePipelines(flavor));
}

function PopulatePipelines(flavor) {
  var filter = $("#searchPipelineInput").val().toUpperCase();
  $.getJSON(`/pipeline/get_pipelines?flavor=${flavor}`, data => {
    $(`#${flavor}_active`).empty();
    $(`#${flavor}_silent`).empty();
    $(`#${flavor}_inactive`).empty();
    data.forEach(doc => {
      let n = doc.name;
      if (filter === '' || (n.toUpperCase().indexOf(filter) > -1)) {
        let status = doc.status;
        if ((status === 'active') && ((doc.silent_until == -1) || (doc.silent_until > Date.now()/1000))) status = 'silent';
        let last_error = doc.cycle - doc.error; // last error X cycles ago
        let status_color = ((last_error < 5) ? 'danger' : 'success');
        if (doc.cycle <= 5) status_color = 'warning'; // status indicator yellow during pipeline start-up
        if (doc.cycle === 0) status_color = 'secondary'; // status indicator grey when pipeline never ran
        $(`#${flavor}_${status}`).append(`<tr><td onclick="PipelineDropdown('${n}')">` +
            `<span class="badge p-2 bg-${status_color} rounded-circle" data-bs-toggle="tooltip" data-bs-placement="right"` +
            `title="process time: &nbsp; ${doc.rate.toPrecision(3)} ms  \n` +
            `last cycle: &nbsp; ${(doc.dt || 0).toPrecision(1)} s \n` +
            `last error: &nbsp; ${doc.cycle - doc.error} cycles ago"><span class="visually-hidden">X</span></span></td>` +
            `<td onclick="PipelineDropdown('${n}')">${n}</td>` +
            `<td id="${n}_description" onclick="PipelineDropdown('${n}')">${doc.description}</td>` +
            `<td id="${n}_silent_until" onclick="PipelineDropdown('${n}')" style="display:none;">Loading</td>`+
            `<td id="${n}_actions">Loading</td><td id="${n}_silent_until"></td></tr>`);
        let stop_button = `<button class="btn btn-danger action_button" onclick="PipelineControl('stop','${n}')"><i class="fas fa-solid fa-stop"></i>Stop</button>`;
        let silence_button = `<button class="btn btn-secondary action_button" onclick="SilenceDropdown('${n}')"><i class="fas fa-solid fa-bell-slash"></i>Silence</button>`;
        let activate_button = `<button class="btn btn-success action_button" onclick="PipelineControl('active','${n}')"><i class="fas fa-solid fa-bell"></i>Activate</button>`;
        let restart_button = `<button class="btn btn-primary action_button" onclick="PipelineControl('restart','${n}')"><i class="fas fa-solid fa-rotate"></i> Restart</button>`;
        let start_button = `<button class="btn btn-success action_button" onclick="StartPipeline('${n}')"><i class="fas fa-solid fa-play"></i> Start</button>`;
        if (status === 'active') {
          $(`#${n}_actions`).html(`${silence_button}${stop_button}${restart_button}`);
        } else if (status === 'silent') {
          $(`#${n}_silent_until`).show();
          if (doc.silent_until == -1) {
            $(`#${n}_silent_until`).html('the end of time');
          } else {
            $(`#${n}_silent_until`).html(new Date(doc.silent_until*1000).toLocaleString());

          }
          $(`#${n}_actions`).html(`${activate_button}${silence_button}${stop_button}${restart_button}`);
        } else {
          $(`#${n}_actions`).html(`${start_button}`);
        }
      }
    }); // data.forEach
    $('[data-bs-toggle="tooltip"]').tooltip();
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
  const bkg_color = ($(':root').attr('data-bs-theme') === 'dark') ? '#212529' : '#ffffff';
  Highcharts.chart('pipeline_vis', {
    chart: {
      height: 'auto',
      inverted: true,
      title: null,
      backgroundColor: bkg_color,
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

function AlarmTemplate() {
  return {
    name: 'alarm_NAME',
    description: '',
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
    description: '',
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
    description: '',
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
  let doc;
  try {
    doc = JSON.parse(JSON.stringify(document.jsoneditor.get()));
  } catch (err) {
    Notify(err, 'error');
    return false;
  }
  if (!(doc.name.startsWith('alarm') || doc.name.startsWith('control') || doc.name.startsWith('convert'))) {
    Notify('Please provide a conforming pipeline name', 'error');
    return false;
  }
  var names = [];
  for (var node of doc.pipeline) {
    if (names.includes(node.name)) {
      Notify('Please give nodes unique names', 'error');
      return false;
    }
    if (node.name.includes('NAME')) {
      Notify('Please give nodes meaningful names', 'error');
      return false;
    }
    names.push(node.name);
  }
  if (echo)
    Notify('Basic validation successful');
  return true;
}

function FillTemplate(which) {
  const doc = which === 'alarm' ? AlarmTemplate() : which === 'control' ? ControlTemplate() : ConvertTemplate();
  document.jsoneditor.set(doc);
  Visualize(doc);
}

function AddOrUpdatePipeline() {
  if (ValidatePipeline(false)) {
    var doc = JSON.parse(JSON.stringify(document.jsoneditor.get()));
    let old_name = $('#detail_pipeline_name').html();
    if (old_name.startsWith("New")) {
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
    } else {
      doc.old_name = old_name;
      $.ajax({
        type: 'POST',
        url: "/pipeline/update_pipeline",
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