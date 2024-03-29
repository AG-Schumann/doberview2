var express = require('express');
var url = require('url');
var router = express.Router();
var common = require('./common');

router.post('/command', common.ensureAuthenticated, function(req, res) {
  var data = req.body;
  if (typeof data.target == 'undefined' || data.target == '' || typeof data.command == 'undefined' || data.command == '')
    return res.json({err: 'Malformed command'});
  var delay = typeof data.delay == 'undefined' ? 0 : parseFloat(data.delay);
  var ret = common.SendCommand(req, data.target, data.command, delay);
  if (typeof ret != 'undefined' && typeof ret.err != 'undefined')
    return res.json({err: ret.err});
  return res.json({notify_msg: `Sent ${data.command} to ${data.target}`, notify_status: 'success'});
});

router.get('/status', function(req, res) {
  mongo_db.get('experiment_config').findOne({name: 'hypervisor'})
  .then(doc => res.json(doc))
  .catch(err => {console.log(err.message); return res.json({});});
});

router.get('/device_status', function(req, res) {
  var q = url.parse(req.url, true).query;
  if (typeof q.device == 'undefined')
    return res.json({});
  mongo_db.get('experiment_config').findOne({name: 'hypervisor'})
  .then(doc => res.json({
      active: doc.processes.active.includes(q.device),
      managed: doc.processes.managed.includes(q.device)
    })
  ).catch(err => {console.log(err.message); return res.json({err: err.message});});
});

module.exports = router;
