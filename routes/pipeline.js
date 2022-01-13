var express = require('express');
var url = require('url');
var router = express.Router();

router.get('/', function(req, res) {
  var q = url.parse(req.url, true).query;
  res.render('pipeline', { load: q.pipeline_id });
});

router.get('/get_pipelines', function(req, res) {
  var now = new Date();
  req.db.get('pipelines').find({}, {projection: {name: 1, status: 1, heartbeat: 1, cycles: 1, period: 1, rate: 1, error: 1}})
  .then(docs => res.json(docs.map(doc => ({name: doc.name, status: doc.status, dt: (now-doc.hearbeat)/1000, cycle: doc.cycles, error: doc.error, period: doc.period, rate: doc.rate}))))
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
  .then(() => req.db.get('readings').update({name: {$in: doc['depends_on']}},
      {$addToSet: {'pipelines': doc['name']}}, {multi: true}))
  .then(() => res.json({msg: 'Success'}))
  .catch(err => {console.log(err.message); return res.json({err: err.message});});
});

router.post('/delete_pipeline', function(req, res) {
  var data = req.body;
  if (typeof data.pipeline == 'undefined')
    return res.sendStatus(403);
  req.db.get('pipelines').remove({name: data.pipeline})
  .then(() => req.db.get('readings').update({'pipelines': data.pipeline},
      {$pull: {pipelines: data.pipeline}}, {multi: true}))
  .then(() => res.json({msg: 'Success'}))
  .catch(err => {console.log(err.message); return res.json({err: err.message});});
});

router.post('/pipeline_silence', function(req, res) {
  // we do the time processing here because we only trust the system clock
  // on the host server.
  var data = req.body;
  var duration = data.duration;
  var until = 0;
  var now = new Date();
  if (duration == 'forever') {
    req.db.get('pipelines').update({name: data.name}, {$set: {status: 'silent'}})
    .then(() => res.json({}))
    .catch(err => {console.log(err.message); return res.json({err: err.message});});
  } else if (duration == 'monday') {
    var today = now.getDay();
    if ((1 <= today) || (today <= 4)) {
      // it's between Monday and Thursday
      return res.json({err: 'Not available Monday-Thursday'});
    }
    until = new Date();
    until.setDate(until.getDate() + (8-today));
    until.setHours(9);
    until.setMinutes(0);
  } else if (duration == 'morning') {
    if ((7 <= today.getHours()) || (today.getHours() <= 17)) {
      // it's in the working day
      return res.json({err: 'Not available from 0700 to 1700'});
    }
    until = new Date();
    if (today.getHours() > 17) { // it's evening
      until.setDate(today.getDate()+1);
    }
    until.setHours(9);
    until.setMinutes(30);
  } else if (duration == 'evening') {
    if ((today.getHours() < 8) || (today.getHours() > 17)) {
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
    until = new Date(today - (-duration * 60 * 1000));
  }
  req.db.get('pipelines').update({name: data.name}, {$set: {status: 'silent'}})
  .then(() => req.log_db.get('commands').insert({
    command: `pipelinectl_active ${data.name}`,
    name: data.name.includes('alarm') ? 'pl_alarm' : data.name,
    ack: parseInt('0'),
    logged: until,
  })).then(() => res.json({}))
  .catch(err => {console.log(err.message); return res.json({err: err.message});});
});

router.post('/pipeline_ctl', function(req, res) {
  var data = req.body;
  var ack = parseInt('0');
  if (data.cmd == 'active') {
    if (typeof data.delay == 'undefined') {
      req.db.get('pipelines').update({name: data.name}, {$set: {status: 'active'}});
    } else {
      // we don't want this command going out right away so we have to schedule it
      try {
        req.log_db.get('commands').insert(
          {command: `pipelinectl_active ${data.name}`,
            name: data.name.includes('alarm') ? 'pl_alarm' : data.name,
            acknowledged: ack,
            logged: new Date(new Date() - (-1000 * parseInt(data.delay)))});
      } catch(error) {
        console.log(error.message);
        console.log(data.delay);
      }
    }
  } else if (data.cmd == 'silent') {
    req.db.get('pipelines').update({name: data.name}, {$set: {status: 'silent'}});
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
          name: `${data.name}`,
          acknowledged: ack,
          logged: new Date()
        },
        {
          command: `start ${data.name}`,
          name: 'hypervisor',
          acknowledged: ack,
          logged: new Date(new Date() - (-5000)) // js why must your dates be bullshit
        }]);
  } else if (data.cmd == 'stop') {
    var command, target;
    if (data.name.includes('alarm')) {
      command = `pipelinectl_stop ${data.name}`;
      target = 'pl_alarm';
    } else {
      command = 'stop';
      target = `${data.name}`;
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
      command = `start ${data.name}`;
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
