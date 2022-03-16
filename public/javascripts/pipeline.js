function UpdateLoop() {
  PopulatePipelines();
}

function PopulatePipelines() {
  var filter = $("#searchPipelineInput").val().toUpperCase();
  var stop = 'fas fa-hand-paper';
  var silent = 'fas fa-bell-slash';
  var active = 'fas fa-bell';
  var restart = "fas fa-angle-double-left";
  $.getJSON("/pipeline/get_pipelines", data => {
    $("#active_pipelines").empty();
    $("#silent_pipelines").empty();
    $("#inactive_pipelines").empty();
    data.forEach(doc => {
      var n = doc.name;
      if (n.toUpperCase().indexOf(filter) > -1) {
        if (doc.status == 'active') {
          var row = `<tr><td onclick="PipelineDropdown('${n}')">${n}</td>`;
          row += `<td>${doc.rate.toPrecision(3)}</td> <td>${doc.cycle}</td> <td>${doc.error}</td>`;
          row += `<td><i class="${silent}" data-bs-toggle="tooltip" title="Silence", onclick="SilenceDropdown('${n}')"></i>`;
          row += `<i class="${stop}" data-bs-toggle="tooltip" title="Stop" onclick="PipelineControl('stop','${n}')"></i>`;
          row += `<i class="${restart}" data-bs-toggle="tooltip" title="Restart" onclick="PipelineControl('restart','${n}')"></i></tr>`;
          $("#active_pipelines").append(row);
        } else if (doc.status == 'silent') {
          var row = `<tr><td onclick="PipelineDropdown('${n}')">${n}</td>`;
          row += `<td>${doc.rate.toPrecision(3)}</td> <td>${doc.cycle}</td> <td>${doc.error}</td>`;
          row += `<td><i class="${active}" data-bs-toggle="tooltip" title="Activate" onclick="PipelineControl('active','${n}')"></i>`;
          row += `<i class="${stop}" data-bs-toggle="tooltip" title="Stop" onclick="PipelineControl('stop','${n}')"></i>`;
          row += `<i class="${restart}" data-bs-toggle="tooltip" title="Restart" onclick="PipelineControl('restart','${n}')"></i></tr>`;
          $("#silent_pipelines").append(row);
        } else if (doc.status == 'inactive') {
          var row = `<tr><td onclick="PipelineDropdown('${n}')">${n}</td>`;
          row += `<td><i class="fas fa-play" onclick="StartPipeline('${n}')"></td>`;
          $("#inactive_pipelines").append(row);
        } else
          console.log(doc)
      }
      $('[data-bs-toggle="tooltip"]').tooltip();
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

function FillTemplate() {
  var doc = {
    name: 'INSERT NAME HERE',
    pipeline: [
      {
        name: 'source',
        type: 'InfluxSourceNode',
        input_var: 'INSERT SENSOR NAME HERE'
      }
    ],
    node_config: {
      'source': {},
    },
  };
  document.jsoneditor.set(doc);
  Visualize(doc);
}

function AddOrUpdatePipeline() {
  var doc;
  try{
    doc = JSON.parse(JSON.stringify(document.jsoneditor.get()));
  }catch(err){alert(err); return;};
  if (doc.name == 'INSERT NAME HERE') {
    alert('You didn\'t add a name');
    return;
  }
  try{
    if (doc.pipeline.filter(n => n.input_var == 'INSERT SENSOR NAME HERE').length > 0) {
      alert('You didn\'t specify sensor names');
      return;
    }
  }catch(err){alert(err); return;}
  if (typeof doc._id != 'undefined')
    delete doc._id;
  $.post("/pipeline/add_pipeline", doc, (data, status) => {
    if (typeof data.err != 'undefined')
      alert(data.err);
    else
      $("#pipelinebox").modal('hide');
  });
}

function DeletePipeline() {
  var name;
  try {
    name = JSON.parse(JSON.stringify(document.jsoneditor.get())).name;
  }catch(err){alert(err); return;}
  $.post(`/pipeline/delete_pipeline`, {pipeline: name}, (data, status) => {
    if (typeof data != 'undefined' && typeof data.err != 'undefined') {
      alert(data.err);
    } else
      $("#pipelinebox").modal('hide');
  });
}

function StartPipeline(name) {
  $.post('/pipeline/pipeline_ctl', {name: name, cmd: 'start'}, (data, status) => {
    if (typeof data != 'undefined' && typeof data.err != 'undefined') {
      alert(data.err);
      return;
    }
  });
}

function SilencePipeline(duration) {
  var name = $("#silence_me").html();
  $.post("/pipeline/pipeline_silence", {name: name, duration: duration}, (data, status) => {
    if (typeof data != 'undefined' && typeof data.err != 'undefined')
      alert(data.err);
    PopulatePipelines();
  });
  $("#silence_dropdown").css('display', 'none');
}

function PipelineControl(action, pipeline) {
  cmd = {cmd: action, name: pipeline};
  $.post("/pipeline/pipeline_ctl", cmd, (data, status) => {
    if (typeof data != 'undefined' && typeof data.err != 'undefined')
      alert(data.err);
    PopulatePipelines();
  });
}

function NewPipelineDropdown() {
  FillTemplate();
  $('#pipelinebox').modal('show');
}

function PipelineDropdown(pipeline) {
  $.getJSON(`/pipeline/get_pipeline?name=${pipeline}`, doc => {
    Visualize(doc);
    document.jsoneditor.set(doc);
  });
  $('#pipelinebox').modal('show');
}
