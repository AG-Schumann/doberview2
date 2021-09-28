function UpdateLoop() {
  
}

function PopulatePipelines() {
  $.getJSON("/pipeline/get_pipelines", data => {
    data.forEach(doc => {
      doc['names'].forEach(n => $("#pipeline_select").append(`<option value='${n}'>${n}</option>`));
      var stop = 'fas fa-hand-paper';
      var silent = 'fas fa-bell-slash';
      var active = 'fas fa-bell';
      var restart = "fas fa-angle-double-left";
      if (doc._id == 2) // active
        doc['names'].forEach(n => $("#active_pipelines").append(
          `<tr><td onclick="Fetch('${n}')">${n}</td><td><i onclick='' class="${stop}"></td> <td><i onclick='' class="${restart}"></td><td><i onclick='' class="${silent}"></td></tr>`));
      else if (doc._id == 1) // silent
        doc['names'].forEach(n => $("#silent_pipelines").append(`<tr><td onclick="Fetch('${n}')">${n}</td><td><i onclick='' class="${active}"></td><td><i onclick='' class="${stop}"></td></tr>`));
      else if (doc._id == 0) // inactive
        doc['names'].forEach(n => $("#inactive_pipelines").append(`<tr><td onclick="Fetch('${n}')">${n}</td><td><i onclick='' class="${silent}"></td><td><i class="${active}" onclick=''></td></tr>`));
      else
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
  Object.entries(doc.pipeline).forEach(item => {(item[1].downstream || []).forEach(ds => 
    data.push({from: item[0], to: ds}));});
  var nodes = Object.entries(doc.pipeline).map(item => ({id: item[0], name: item[0], title: item[1].type}));
  Highcharts.chart('pipeline_vis', {
    chart: {
      height: 'auto',
      inverted: true,
      title: null,
    },
    title: {text: null},
    credits: {enabled: false},
    //nodeWidth: 100,

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

function ValidatePipeline() {

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

  $.post("/pipeline/
}

function PipelineControl(action, pipeline) {

  $.post("/pipeline/pipeline_ctl", {cmd: action, name: pipeline}, (data, status) => {

  });
}
