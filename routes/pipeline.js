var express = require('express');
var url = require('url');
var router = express.Router();

router.get('/', function(req, res) {
  var q = url.parse(req.url, true).query;
  res.render('pipeline', { load: q.pipeline_id });
});

router.get('/get_pipelines', function(req, res) {
  var now = new Date();
  req.db.get('pipelines').find({}, {projection: {name: 1, status: 1, heartbeat: 1, cycles: 1, period: 1}})
  .then(docs => res.json(docs.map(doc => ({name: doc.name, status: doc.status, dt: (now-doc.hearbeat)/1000, cycle: doc.cycles, error: doc.error, period: doc.period}))))
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

router.post('/add_pipeline', function(req, res) {
  var doc = req.body.doc;
  doc['status'] = 'inactive';
  doc['cycles'] = parseInt('0');
  doc['error'] = parseInt('0');
  doc['rate'] = -1;
  doc['depends_on'] = doc.pipeline.filter(n => (typeof n.upstream == 'undefined' || n.upstream.length == 0)).map(n => n.input_var);
  req.db.get('pipelines').insert(doc)
  .then(() => req.db.get('readings').update({name: {$in: doc['depends_on']}}, {$addToSet: {'pipelines': doc['name']}}, {multi: true}))
  .then(() => res.json({}))
  .catch(err => {console.log(err.message); return res.json({err: err.message});});
});

router.post('/delete_pipeline', function(req, res) {
  var data = req.body;
  if (typeof data.pipeline == 'undefined')
    return res.sendStatus(403);
  req.db.get('pipelines').remove({name: data.pipeline})
  .then(() => req.db.get('readings').update({'pipelines': data.pipeline}, {$pull: {pipelines: data.pipeline}}, {multi: true}))
  .then(() => res.json({}))
  .catch(err => {console.log(err.message); return res.json({err: err.message});});
});

router.post('/pipeline_ctl', function(req, res) {
  var data = req.body.data;
  var ack = parseInt('0');
  if (data.cmd == 'active') {
    if (typeof data.delay == 'undefined') {
      req.db.get('pipelines').update({name: data.name},{$set: {status: 'active'}});
    } else {
      // we don't want this command going out right away so we have to schedule it
      try {
        req.log_db.get('commands').insert(
          {command: `pipelinectl_active ${data.name}`,
            name: `pl_${data.name}`,
            acknowledged: ack,
            logged: new Date(new Date() - (-1000 * parseInt(data.delay)))});
      } catch(error) {
        console.log(error.message);
        console.log(data.delay);
      }
    }
  } else if (data.cmd == 'silent') {
    req.db.get('pipelines').update({name: data.name},{$set: {status: 'silent'}});
  } else if (data.cmd == 'restart') {
    if (data.name.includes('alarm')) // all alarm pls handled by one monitor
      req.log_db.get('commands').insert({
        command: `pipelinectl_restart ${data.name}`,
        name: 'pl_alarm',
        acknowledged: ack,
        logged: new Date()});
    else // two-step process to restart a control pl
      req.log_db.get('commands').insert([
        {
          command: `stop`,
          name: `pl_${data.name}`,
          acknowledged: ack,
          logged: new Date()
        },
        {
          command: `start pl_${data.name}`,
          name: 'hypervisor',
          acknowledged: ack,
          logged: new Date(new Date() - (-10000)) // js why must your dates be bullshit
        }]);
  } else if (data.cmd == 'stop') {
    var command, target;
    if (data.name.includes('alarm')) {
      command = `pipelinectl_stop ${data.name}`;
      target = 'pl_alarm';
    } else {
      command = 'stop';
      target = `pl_${data.name}`;
    }
    req.log_db.get('commands').insert({
      command: command,
      name: target,
      acknowledged: ack,
      logged: new Date()});
  } else if (data.cmd == 'start') {
    var command, target;
    if (data.name.includes('alarm')) {
      command = `pipelinectl_start ${data.name}`;
      target = 'pl_alarm';
    } else {
      command = `start pl_${data.name}`;
      target = 'hypervisor';
    }
    req.log_db.get('commands').insert({
      command: command,
      name: target,
      acknowledged: ack,
      logged: new Date()});
  }
  return res.sendStatus(304);
});

module.exports = router;
