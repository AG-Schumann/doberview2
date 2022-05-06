var express = require('express');
var url = require('url');
var router = express.Router();

router.get('/', function(req, res) {
  var q = url.parse(req.url, true).query;
  res.render('alarms', {});
});

router.get('/acknowledge', function(req, res) {
  var q = url.parse(req.url, true).query;
  var hash = q.alarm_id;
  var ack_for = 30*60*1000; // 30 minutes
  if (typeof uuid == 'undefined')
    return res.send("");
  req.logging_db.get().find_one({hash: hash})
  .then(doc => {
    if (doc != null) {
      return req.db.get('pipelines').update({name: name}, {$set: {status: 'silent'}});
    } else {
      throw({message: "Alarm already acknowledged"});
    }
  }).then(() => req.logging_db.get('commands').insert({
        command: `pipelinectl_active ${name}`, name: name,
        acknowledged: parseInt('0'), logged: new Date(new Date() - ack_for)}))
  .then(() => res.send('Success'))
  .catch(err => res.send(err.message));
});

router.get('/test', function(req, res) {
  //var now = new Date();
  //var base = '2021-12-20T';
  //if (Date.parse(base+'09:30:00+01:00') < now && now < Date.parse(base+'10:30:00+01:00')) {
  var level = req.level;
    req.logging_db.get('alarm_history').insert({'msg': 'Test alarm', acknowledged: parseInt('0'), level: parseInt(level)})
    .then(() => res.send(`Alarm sent at level ${level}`))
    .catch(err => {console.log(err.message); return res.send(err.message);});
  //} else {
  //  return res.send('Wrong time');
  //}
});

module.exports = router;
