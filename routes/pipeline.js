var express = require('express');
var url = require('url');
var router = express.Router();
var common = require('./common');


router.get('/', function(req, res) {
  var q = url.parse(req.url, true).query;
  var load = q.pipeline_id || "";
  var config = common.GetRenderConfig(req);
  config.load = load;
  res.render('pipeline', config);
});

router.get('/get_pipelines', function(req, res) {
  var q = url.parse(req.url, true).query;
  if (typeof q.flavor == 'undefined') {
    return res.json([]);
  }
  var flavor = q.flavor;
  var now = new Date();
  req.db.get('pipelines').find({name: {$regex: `^${flavor}_`}}, {projection: {name: 1, status: 1, heartbeat: 1, cycles: 1, rate: 1, error: 1}})
  .then(docs => res.json(docs.map(doc => ({name: doc.name, status: doc.status, dt: (now-doc.heartbeat)/1000, cycle: doc.cycles, error: doc.error, rate: doc.rate}))))
  .catch(err => {console.log(err.message); return res.json([]);});
});

router.get('/get_pipeline', function(req, res) {
  var q = url.parse(req.url, true).query;
  if (typeof q.name == 'undefined')
    return res.json({});
  req.db.get('pipelines').findOne({name: q.name})
  .then(doc => res.json(doc))
  .catch(err => {console.log(err.message); return res.json({});});
});

router.get('/status', function(req, res) {
  var q = url.parse(req.url, true).query;
  if (typeof q.name == 'undefined')
    return res.json({});
  req.db.get('pipelines').findOne({name: q.name}, {projection: {status: 1}})
  .then(doc => res.json(doc))
  .catch(err => {console.log(err.message); return res.json({});});
});

router.post('/add_pipeline', common.ensureAuthenticated, function(req, res) {
  var doc = req.body;
  if (typeof doc.name == 'undefined' || 
      !['alarm', 'control', 'convert'].includes(doc.name.split('_')[0]) ||
      typeof doc.pipeline == 'undefined' || 
      doc.pipeline.length == 0)
    return res.json({err: 'Bad input'});
  doc['status'] = doc.status || 'inactive';
  doc['cycles'] = parseInt('0');
  doc['error'] = parseInt('0');
  doc['rate'] = -1;
  doc['depends_on'] = doc.pipeline.filter(n => (typeof n.upstream == 'undefined' || n.upstream.length == 0)).map(n => n.input_var);
  if (typeof doc.node_config == 'undefined')
    doc['node_config'] = {};
  req.db.get('pipelines').update({name: doc.name}, {$set: doc}, {upsert: true})
  .then(() => req.db.get('sensors').update({}, {$pull: {'pipelines': doc.name}}, {multi: true}))
  .then(() => req.db.get('sensors').update({name: {$in: doc['depends_on']}},
      {$addToSet: {'pipelines': doc['name']}}, {multi: true}))
  .then(() => res.json({notify_msg: 'Pipeline added', notify_status: 'success'}))
  .catch(err => {console.log(err.message); return res.json({err: err.message});});
});

router.post('/delete_pipeline', common.ensureAuthenticated, function(req, res) {
  var data = req.body;
  if (typeof data.pipeline == 'undefined')
    return res.json({err: 'Bad input'})
  req.db.get('pipelines').remove({name: data.pipeline})
  .then(() => req.db.get('sensors').update({'pipelines': data.pipeline},
      {$pull: {pipelines: data.pipeline}}, {multi: true}))
  .then(() => res.json({notify_msg: 'Pipeline deleted', notify_status: 'success'}))
  .catch(err => {console.log(err.message); return res.json({err: err.message});});
});

router.post('/pipeline_silence', common.ensureAuthenticated, function(req, res) {
  // we do the time processing here because we only trust the system clock
  // on the host server.
  var data = req.body;
  var duration = data.duration;
  var until = null;
  var now = new Date();
  var flavor = data.name.split('_')[0];
  if (duration == 'forever') {
    req.db.get('pipelines').update({name: data.name}, {$set: {status: 'silent'}})
    .then(() => res.json({}))
    .catch(err => {console.log(err.message); return res.json({err: err.message});});
  } else if (duration == 'monday') {
    var day = now.getDay();
    if ((1 <= day) && (day <= 4)) {
      // it's between Monday and Thursday
      return res.json({err: 'Not available Monday-Thursday'});
    }
    until = new Date();
    until.setDate(until.getDate() + (8-day));
    until.setHours(9);
    until.setMinutes(0);
  } else if (duration == 'morning') {
    if ((7 <= now.getHours()) && (now.getHours() <= 17)) {
      // it's in the working day
      return res.json({err: 'Not available from 0700 to 1700'});
    }
    until = new Date();
    if (now.getHours() > 17) { // it's evening
      until.setDate(now.getDate()+1);
    }
    until.setHours(9);
    until.setMinutes(30);
  } else if (duration == 'evening') {
    if ((now.getHours() < 8) || (17 < now.getHours())) {
      // not working hours
      return res.json({err: 'Only available during working hours'});
    }
    until = new Date();
    until.setHours(18);
    until.setMinutes(0);
  } else {
    try{
      duration = parseInt(duration);
    }catch(err){
      console.log(duration);
      console.log(err.message);
      return res.json({err: "Invalid duration"});
    }
    until = new Date(now.getTime() + duration * 60 * 1000);
  }
  var delay = until - now;
  common.SendCommand(req, `pl_${flavor}`, `pipelinectl_silent ${data.name}`);
  common.SendCommand(req, `pl_${flavor}`, `pipelinectl_active ${data.name}`, delay);
  return res.json({});
});

router.post('/pipeline_ctl', common.ensureAuthenticated, function(req, res) {
  var data = req.body;
  var flavor = data.name.split('_')[0];
  if (['stop','start','restart','active','silent'].includes(data.cmd))
    common.SendCommand(req, `pl_${flavor}`, `pipelinectl_${data.cmd} ${data.name}`);
  else
    return res.json({err: 'Invalid command'});
  return res.json({notify_msg: 'Command sent to pipeline', notify_status: 'success'});

});

module.exports = router;
