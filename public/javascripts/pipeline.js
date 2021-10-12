function PopulateDropdown() {
  $.getJSON("/pipeline/get_pipelines", data => {
    data.forEach(doc => {
      doc['names'].forEach(n => $("#pipeline_select").append(`<option value='${n}'>${n}</option>`));
    });
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
  var durations = [[60, '1 minute'], [600, '10 minutes'], [3600, '1 hour'], [84600, '1 day'], [0, 'Indefinitely']];
  $.getJSON("/pipeline/get_pipelines", data => {
    $("#active_pipelines").empty();
    $("#silent_pipelines").empty();
    $("#inactive_pipelines").empty();
    data.forEach(doc => {
      var n = doc.name;
      if (doc.status == 'active') {
        var row = `<tr><td onclick="Fetch('${n}')">${n}</td>`;
        row += `<td>${doc.period}</td><td>${doc.cycle}>/td><td>${doc.error}</td>`;
        row += `<td class="dropdown"><i onclick="$('#${n}_drop').css('display', 'block')" class="${silent}"><div id="${n}_drop" class="dropbtn-content">` + durations.reduce((tot, row) => tot + `<button onclick=PipelineControl('silent','${n}',${row[0]}) class="btn btn-info dropbtn">${row[1]}</button>`, '') + '</div></td>';
        row += `<td><i onclick="PipelineControl('stop','${n}')" class="${stop}"></td>`;
        row += `<td><i onclick="PipelineControl('restart','${n}')" class="${restart}"></td></tr>`;
        $("#active_pipelines").append(row);
      } else if (doc.status == 'silent') {
        var row = `<tr><td onclick="Fetch('${n}')">${n}</td>`;
        row += `<td>${doc.period}</td> <td>${doc.cycle}</td> <td>${doc.error}</td>`;
        row += `<td><i onclick="PipelineControl('active','${n}') class="${active}"></td>`;
        row += `<td><i onclick="PipelineControl('stop','${n}') class="${stop}"></td>`;
        row += `<td><i onclick="PipelineControl('restart','${n}')" class="${restart}"</td></tr>`;
        $("#silent_pipelines").append(row);
      } else if (doc.status == 'inactive') {
        var row = `<tr><td onclick="Fetch('${n}')">${n}</td>`;
        row += `<td><i onclick="" class="${silent}"></td>`;
        row += `<td><i class="${active}" onclick=''></td></tr>`;
        $("#inactive_pipelines").append(row);
      } else
        console.log(doc);
    }); // data.forEach
  }); // getJSON
}

function FillTemplate() {
  var doc = {
    name: "INSERT NAME HERE",
    pipeline: {
      config: {
        source: {
          type: "InfluxSourceNode",
          input_var: "INSERT READING NAME HERE",
          downstream: ['alarm'],
        },
        alarm: {
          type: 'SimpleAlarmNode',
          upstream: ['source'],
          input_var: 'INSERT READING NAME HERE'
        }
      },
    },
    period: "INSERT PERIOD HERE",
    node_config: {
      alarm: {
        recurrence: 3,
        alarm_levels: [[-1, 1], [-2, 2]]
      }}
  };
  Visualize(doc)
  document.jsoneditor.set(doc);
}

function Fetch(pipeline) {
  $.getJSON(`/pipeline/get_pipeline?name=${pipeline}`, doc => {
    if (typeof doc.err != 'undefined') {
      alert(doc.err);
      return;
    }
    Visualize(doc);
    document.jsoneditor.set(doc);
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
    parseFloat(doc.period);
  }catch(err){alert('Is the period a valid number?'); return;}
  doc['status'] = 'offline';

  //$.post("/pipeline/
}

function DeletePipeline() {
  $.post(`/pipeline/delete_pipeline`, {pipeline: $("#pipeline_select").val()}, (data, status) => {
    console.log(data);
    console.log(status);
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
