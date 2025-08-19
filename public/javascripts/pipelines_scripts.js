function PopulatePipelinesNavbar() {
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

function formatDt(seconds) {
  if (seconds < 60) return `${Math.round(seconds)} s`;
  if (seconds < 3600) return `${Math.round(seconds / 60)} min`;
  if (seconds < 86400) return `${Math.round(seconds / 3600)} h`;
  return `${Math.round(seconds / 86400)} d`;
}

function pipelineStatusColor(doc) {
  let last_error = doc.cycles - doc.error;
  if (doc.cycles === 0) return 'secondary'; // never ran
  if (doc.cycles < doc.startup_cycles) return 'warning'; // startup
  return (last_error <= 1) ? 'danger' : 'success';
}

function pipelineTooltip(doc) {
  const dt = (new Date() - new Date(doc.heartbeat)) / 1000;
  const dt_text = formatDt(dt);
  const status_color = pipelineStatusColor(doc);
  const last_error = doc.cycles - doc.error;

  return `
    <span class="badge p-2 bg-${status_color} rounded-circle" data-bs-toggle="tooltip"
      data-bs-placement="right"
      title="process time: ${Math.round(doc.rate)} ms\nlast cycle: ${dt_text} ago\nlast error: ${last_error} cycles ago">
      <span class="visually-hidden">X</span>
    </span>`;
}

function pipelineButtons(pl_name, flavor, status, silent_until) {
  const btns = {
    stop:     `<button class="btn btn-danger action_button" onclick="PipelineControl('stop','${pl_name}')"><i class="fas fa-solid fa-stop"></i></button>`,
    start:    `<button class="btn btn-success action_button" onclick="PipelineControl('start','${pl_name}')"><i class="fas fa-solid fa-play"></i></button>`,
    restart:  `<button class="btn btn-primary action_button" onclick="PipelineControl('restart','${pl_name}')"><i class="fas fa-solid fa-rotate"></i></button>`,
    silence:  `<button class="btn btn-secondary action_button" onclick="SilenceDropdown('${pl_name}')"><i class="fas fa-solid fa-bell-slash"></i></button>`,
    activate: `<button class="btn btn-success action_button" onclick="PipelineControl('active','${pl_name}')"><i class="fas fa-solid fa-bell"></i></button>`
  };

  if (status === 'active') {
    if (silent_until === -1 || silent_until > Date.now() / 1000) {
      return [btns.activate, btns.silence, btns.stop, btns.restart];
    }
    return [btns.silence, btns.stop, btns.restart];
  }
  return [btns.start];
}

function GetPipelineTooltip(doc) {
  return `<tr><td onclick="PipelineDropdown('${doc.name}')">` +
      pipelineTooltip(doc) +
      `</td>`;
}

function PopulatePipelines(flavor) {
  const filter = $("#searchPipelineInput").val().replace(/_/g, '').toUpperCase();
  $.getJSON(`/pipelines/by_flavor?flavor=${flavor}`, data => {
    $(`#${flavor}_active, #${flavor}_silent, #${flavor}_inactive`).empty();

    data.forEach(doc => {
      const n = doc.name.replace(/_/g, '').toUpperCase();
      if (filter && n.indexOf(filter) === -1) return;

      let status = doc.status;
      if (status === 'active' && (doc.silent_until === -1 || doc.silent_until > Date.now()/1000)) {
        status = 'silent';
      }

      const tooltip = GetPipelineTooltip(doc);
      const buttons = pipelineButtons(doc.name, flavor, status, doc.silent_until).join('');

      $(`#${flavor}_${status}`).append(
          tooltip +
          `<td onclick="PipelineDropdown('${doc.name}')">${doc.name}</td>` +
          `<td id="${doc.name}_description" onclick="PipelineDropdown('${doc.name}')">${doc.description}</td>` +
          `<td id="${doc.name}_silent_until" style="display:none;"></td>` +
          `<td id="${doc.name}_actions">${buttons}</td></tr>`
      );

      if (status === 'silent') {
        const silent_until = $(`#${doc.name}_silent_until`);
        silent_until.show();
        silent_until.html(doc.silent_until === -1
            ? 'the end of time'
            : new Date(doc.silent_until*1000).toLocaleString());
      }
    });
    $('[data-bs-toggle="tooltip"]').tooltip();
  });
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
        url: "/pipelines/add",
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
        url: "/pipelines/update",
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
      url: '/pipelines/delete',
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
    url: "/pipelines/control",
    data: {cmd: action, name: pipeline},
    success: (data) => {
      if (typeof data != 'undefined' && typeof data.err != 'undefined')
        alert(data.err);
      Notify(data.notify_msg, data.notify_status);
    },
    error: (jqXHR, textStatus, errorCode) => alert(`Error: ${textStatus}, ${errorCode}`),
  });
}

function SilenceDropdown(name) {
  $('#silence_me').html(name);
  $('#silence_dropdown').modal('show');
}

function SilencePipeline(duration, name) {
  if (!name) name = $("#silence_me").html();
  $.ajax({
    type: 'POST',
    url: "/pipelines/silence",
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

function NewPipelineDropdown(flavor) {
  FillTemplate(flavor);
  $("#detail_pipeline_name").html(`New ${flavor} pipeline`);
  $('#pipelinebox').modal('show');
}

function PipelineDropdown(pipeline) {
  $.getJSON(`/pipelines/get?name=${pipeline}`, doc => {
    $("#detail_pipeline_name").html(doc.name);
    Visualize(doc);
    document.jsoneditor.set(doc);
  });
  $('#pipelinebox').modal('show');
}