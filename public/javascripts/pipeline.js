function PopulateDropdown() {
  $.getJSON("/pipeline/get_pipelines", data => {
    $("#pipeline_select").empty();
    data.forEach(doc => $("#pipeline_select").append(`<option value='${doc.name}'>${doc.name}</option>`));
  });
}

function UpdateLoop() {
  PopulatePipelines();
}

function PopulatePipelines() {
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
      if (doc.status == 'active') {
        var row = `<tr><td onclick="Fetch('${n}')">${n}</td>`;
        row += `<td>${doc.rate.toPrecision(3)}</td> <td>${doc.cycle}</td> <td>${doc.error}</td>`;
        row += `<td><button onclick="SilenceDropdown('${n}')"><i class="${silent}"></button>`;
        row += `<td><i class="${stop}" onclick="PipelineControl('stop','${n}')"></td>`;
        row += `<td><i class="${restart}" onclick="PipelineControl('restart','${n}')"></td></tr>`;
        $("#active_pipelines").append(row);
      } else if (doc.status == 'silent') {
        var row = `<tr><td onclick="Fetch('${n}')">${n}</td>`;
        row += `<td>${doc.rate.toPrecision(3)}</td> <td>${doc.cycle}</td> <td>${doc.error}</td>`;
        row += `<td><i class="${active}" onclick="PipelineControl('active','${n}')"></td>`;
        row += `<td><i class="${stop}" onclick="PipelineControl('stop','${n}')"></td>`;
        row += `<td><i class="${restart}" onclick="PipelineControl('restart','${n}')"></td></tr>`;
        $("#silent_pipelines").append(row);
      } else if (doc.status == 'inactive') {
        var row = `<tr><td onclick="Fetch('${n}')">${n}</td>`;
        row += `<td><i class="fas fa-play" onclick="StartPipeline('${n}')"></td>`;
        $("#inactive_pipelines").append(row);
      } else
        console.log(doc);
    }); // data.forEach
  }); // getJSON
}

function Fetch(pipeline) {
  $.getJSON(`/pipeline/get_pipeline?name=${pipeline}`, doc => {
    if (typeof doc.err != 'undefined') {
      alert(doc.err);
      return;
    }
    Visualize(doc);
    document.jsoneditor.set(doc);
    $("#pipeline_select option").filter(function() {return this.value === doc.name;}).prop('selected', 'true');
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
  $('#silence_dropdown').css('display', 'block');
}

function AddNewPipeline() {
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
  $.post("/pipeline/add_pipeline", {doc: doc}, (data, status) => {
    if (typeof data.err != 'undefined')
      alert(data.err);
  });
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
}

function DeletePipeline(cb=null) {
  var name;
  try {
    name = JSON.parse(JSON.stringify(document.jsoneditor.get())).name;
  }catch(err){alert(err); return;}
  $.post(`/pipeline/delete_pipeline`, {pipeline: name}, (data, status) => {
    if (typeof data != 'undefined' && typeof data.err != 'undefined') {
      alert(data.err);
      return;
    }
    if (cb) cb();
    location.reload();
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

