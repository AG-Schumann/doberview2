
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
    document.jsoneditor.set(doc);
  }); // getJSON
}

function Visualize(doc) {
  if (doc == null) {
    try{
      doc = JSON.parse(JSON.stringify(document.jsoneditor.get()));
    }catch(err){alert(err); return;}
  }
  data = [];
  Object.items(doc.pipeline.config).forEach(item => {item[1].downstream.forEach(ds => data.push([item[0], ds]));});
  Highcharts.chart('pipeline_vis', {
    chart: {
      height: 'auto'
    },

    series: [{
      type: 'organization',
      name: doc.name,
      keys: ['from', 'to'],
      data: data
    }],
    levels: [],
    nodes: Object.items(doc.pipeline.config).map(item => {return {id: item[0], title: item[0], name: item[0]};}),
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
