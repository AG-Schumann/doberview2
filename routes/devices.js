var express = require('express');
var url = require('url');
var router = express.Router();
var common = require('./common');

router.get('/list', function(req, res) {
  mongo_db.get('devices').distinct('name')
      .then(docs => res.json(docs))
      .catch(err => {console.log(err.message); res.json([]);});
});

router.get('/distinct_hostnames', function(req, res) {
  mongo_db.get('devices').distinct('host')
      .then(docs => res.json(docs))
      .catch(err => {console.log(err.message); res.json([]);});
});

router.get('/detail', function(req, res) {
  var q = url.parse(req.url, true).query;
  var device = q.device;
  if (typeof device == 'undefined')
    return res.json({});
  mongo_db.get('devices').findOne({name: device})
  .then(doc => res.json(doc))
  .catch(err => {console.log(err.message); return res.json({err: err.message});});
});

router.post('/update', common.ensureAuthenticated, function(req, res) {
  var updates = {};
  var data = req.body.data;
  var device = data.device;
  if (typeof device == 'undefined')
    return res.json({err: 'No device defined'});
  if (typeof data.host == 'undefined')
    return res.json({err: 'No host defined'});
  else
    updates['host'] = data.host;
  if (typeof data.tty != 'undefined')
    updates['address.tty'] = data.tty;
  if (typeof data.ip != 'undefined')
    updates['address.ip'] = data.ip;
  if (typeof data.port != 'undefined')
    try {
      updates['address.port'] = parseInt(data.port);
    } catch (err) {
      console.log(err.message);
    }
  if (typeof data.baud != 'undefined')
    try {
      updates['address.baud'] = parseInt(data.baud);
    } catch (err) {
      console.log(err.message);
    }
  if (typeof data.serial_id != 'undefined')
    updates['address.serialID'] = data.serial_id;
  if (Object.keys(updates).length != 0) {
    mongo_db.get('devices').update({name: device}, {$set: updates})
      .then(() => res.json({msg: 'Success'}))
      .catch(err => {console.log(err.message); return res.json({err: err.message});});
  } else
    return res.json({});
});

module.exports = router;