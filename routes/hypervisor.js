var express = require('express');
var url = require('url');
var router = express.Router();
var net = require('net');

router.get('/', function(req, res) {
  var q = url.parse(req.url, true).query;
  res.render('pipeline', { load: q.pipeline_id });
});

router.post('/command', function(req, res) {
  var data = req.body;
  if (typeof data.target == 'undefined' || data.target == '' || typeof data.command == 'undefined' || data.command == '')
    return res.json({err: 'Malformed command'});
  var ret = SendCommand(req, data.target, data.command);
  if (typeof ret != 'undefined' && typeof ret.err != 'undefined')
    return res.json({err: ret.err});
  return res.json({});
}

function SendCommand(req, to, command, delay=0) {
  var logged = new Date().getTime() + delay;
  return req.db.get('experiment_config').findOne({name: 'hypervisor'})
  .then((doc) => {
    const client = net.createConnection(doc.dispatch_port, doc.host, () => {
      client.write({
        to: to,
        command: command,
        time: logged
      }.toString(), () => client.destroy());
    });
  })
  .catch(err => {console.log(err.message); return {err: err.message};});
}

module.exports = router;
