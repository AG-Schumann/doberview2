const editor_schema = {
  "title": "Pipeline",
  "description": "Pipeline config",
  "type": "object",
  "properties": {
    "name": {
      'title': 'name',
      'description': 'Unique pipeline name',
      'type': 'string'
    },
    "pipeline": {
      'title': 'pipeline settings',
      'description': 'Settings for pipeline setup',
      'type': 'object',
      'required': ['config', 'period'],
      'properties': {
        'config': {
          'title': 'Node declaration',
          'description': 'Which nodes make up this pipeline',
          'type': 'object'
        },
        'period': {
          'title': 'period',
          'description': 'how often the pipeline runs',
          'type': 'number',
          'minimum': 1
        },
      },
    },
    "node_config": {
      'title': 'node config',
      'description': 'Runtime config options for nodes',
      'type': 'object'
    }
  },
  "required": ['name', 'pipeline', 'node_config']
};

function PopulatePipelines() {
  $.getJSON("/pipeline/get_pipelines", data => {
    data.forEach(doc => {
      doc['names'].forEach(n => $("#pipeline_select").append(`<option value='${n}'>${n}</option>`));
      var stop = 'fas fa-stop';
      var start = 'fas fa-play';
      var restart = "fas fa-angle-double-left";
      var reconf = "fas fa-angle-left";
      if (doc._id == 'online')
        doc['names'].forEach(n => $("#active_pipelines").append(
          `<tr onclick="Fetch('${n}')"><td>${n}</td><td><i onclick='StopPipeline("${n}")' class="${stop}"></td> <td><i onclick='RestartPipeline("${n}")' class="${restart}"></td><td><i onclick='ReconfigPipeline("${n}")' class="${reconf}"></td></tr>`));
      else if (doc._id == 'offline')
        doc['names'].forEach(n => $("#inactive_pipelines").append(`<tr onclick="Fetch('${n}')"><td>${n}</td><td><i onclick='StartPipeline("${n}")' class="${start}"></td></tr>`));
      else
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
  }); // getJSON
}

function Visualize(doc) {
  if (doc == null) {
    try{
      doc = JSON.parse(JSON.stringify(document.jsoneditor.get()));
    }catch(err){alert(err); return;}
  }
  var data = [];
  Object.entries(doc.pipeline.config).forEach(item => {(item[1].downstream || []).forEach(ds => 
    data.push({from: item[0], to: ds}));});
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
      keys: ['from', 'to', 'weight'],
      data: data,
      animation: {duration: 0},
    }],
    levels: [],
    nodes: Object.entries(doc.pipeline.config).map(item => {return {id: item[0], title: item[0], name: item[0]};}),
  });
}

function StartPipeline(pipeline) {
  
}

function StopPipeline(pipeline) {

}

function RestartPipeline(pipeline) {

}

function ReconfigPipeline(pipeline) {

}
