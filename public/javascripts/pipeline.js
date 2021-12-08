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
  var durations = [[600, '10 minutes'], [1800, '30 minutes'], [3600, '1 hour'], [84600, '1 day'], [0, 'Forever']];
  $.getJSON("/pipeline/get_pipelines", data => {
    $("#active_pipelines").empty();
    $("#silent_pipelines").empty();
    $("#inactive_pipelines").empty();
    data.forEach(doc => {
      var n = doc.name;
      if (doc.status == 'active') {
        var row = `<tr><td onclick="Fetch('${n}')">${n}</td>`;
        row += `<td>${doc.rate.toPrecision(3)}</td><td>${doc.cycle}>/td><td>${doc.error}</td>`;
        row += `<td class="dropdown"><i onclick="$('#${n}_drop').css('display', 'block')" class="${silent}">`;
        row += `<div id="${n}_drop" class="dropbtn-content">`
        row += durations.reduce((tot, row) => tot + `<button onclick=PipelineControl('silent','${n}',${row[0]}) class="btn btn-info dropbtn">${row[1]}</button>`, '') + '</div></td>';
        row += `<td><i onclick="PipelineControl('stop','${n}')" class="${stop}"></td>`;
        row += `<td><i onclick="PipelineControl('restart','${n}')" class="${restart}"></td></tr>`;
        $("#active_pipelines").append(row);
      } else if (doc.status == 'silent') {
        var row = `<tr><td onclick="Fetch('${n}')">${n}</td>`;
        row += `<td>${doc.rate.toPrecision(3)}</td> <td>${doc.cycle}</td> <td>${doc.error}</td>`;
        row += `<td><i onclick="PipelineControl('active','${n}') class="${active}"></td>`;
        row += `<td><i onclick="PipelineControl('stop','${n}') class="${stop}"></td>`;
        row += `<td><i onclick="PipelineControl('restart','${n}')" class="${restart}"</td></tr>`;
        $("#silent_pipelines").append(row);
      } else if (doc.status == 'inactive') {
        var row = `<tr><td onclick="Fetch('${n}')">${n}</td>`;
        row += `<td><i onclick="StartPipeline('${n}', 'silent')" class="${silent}"></td>`;
        row += `<td><i class="${active}" onclick="StartPipeline('${n}', 'active')"></td></tr>`;
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
  $('#pl_name').html(name);
  $(`#${name}_drop`).style('display', 'block');
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
    if (doc.pipeline.filter(n => n.input_var == 'INSERT READING NAME HERE').length > 0) {
      alert('You didn\'t specify reading names');
      return;
    }
  }catch(err){alert(err); return;}

  $.post("/pipeline/add_pipeline", {doc: doc}, (data, status) => {
    if (typeof data.err != 'undefined')
      alert(data.err);
  });
}

function DeletePipeline(name=null, cb=null) {
  name = name || $("#pipeline_select").val();
  $.post(`/pipeline/delete_pipeline`, {pipeline: name}, (data, status) => {
    if (typeof data.err != 'undefined') {
      alert(data.err);
      return;
    }
    if (cb) cb();
    PopulateDropdown();
    PopulatePipelines();
  });
}

function StartPipeline(name, status) {
  $.post('/pipeline/pipeline_ctl', {name: name, cmd: status}, (data, status) => {
    if (typeof data.err != 'undefined') {
      alert(data.err);
      return;
    }
    $.post('/pipeline/pipeline_ctl', {name: name, cmd: 'start'}, (data, status) => {
      if (typeof data.err != 'undefined') {
        alert(data.err);
        return;
      }
    });
  });
}

function SilencePipeline() {
  var name = $("#pl_name").html();
  var delay = $("#silence_duration").val();
  $.post("/pipeline/pipeline_ctl", {cmd: 'silent', name: name}, (data, status) => {
    if (duration != 0)
      $.post("/pipeline/pipeline_ctl", {cmd: 'active', name: name, delay: delay}, (data, status) => {

      });
  });
}

function PipelineControl(action, pipeline, delay=null) {
  cmd = {cmd: action, name: pipeline};
  if (delay != null && delay != 0) cmd.delay = delay;
  $.post("/pipeline/pipeline_ctl", cmd, (data, status) => {
    console.log(data);
    console.log(status);
  });
}
