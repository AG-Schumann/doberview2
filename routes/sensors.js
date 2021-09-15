var express = require('express');
var url = require('url');
var router = express.Router();

router.get('/', function(req, res) {
  res.render('sensors', { title: 'Express' });
});

router.get('/sensor_list', function(req, res) {
  return res.json(req.db.sensors.distinct('name'));
});

router.get('/sensor_detail', function(req, res) {
  var q = url.parse(req.url, true).query;
  var sensor = q.sensor;
  if (typeof sensor == 'undefined')
    return res.json({});
  req.db.sensors.findOne({sensor: sensor})
  .then(doc => res.json(doc))
  .catch(err => {console.log(err.message); return res.json({err: err.message});});
});

router.get('/reading_list', function(req, res) {
  return res.json(req.db.readings.distinct('name'));
});

router.get('/reading_detail', function(req, res) {
  var q = url.parse(req.url, true).query;
  var reading = q.reading;
  if (typeof reading == 'undefined')
    return res.json({});
  req.db.readings.findOne({name: reading})
  .then(doc => res.json(doc))
  .catch(err => {console.log(err.message); return res.json({err: err.message});});
});

router.post('/update_sensor_address', function(req, res) {
  var updates = {};
  var data = req.body.data;
  var sensor = data.sensor;
  if (typeof sensor == 'undefined')
    return res.json({err: 'No sensor defined'});
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
    req.db.sensors.update({sensor: sensor}, {$set: updates})
      .then(() => res.json({msg: 'Success'}))
      .catch(err => {console.log(err.message); return res.json({err: err.message});});
  } else
    return res.json({});
});

router.post('/update_reading', function(req, res) {
  var updates = {};
  var data = req.body.data;
  var sensor = data.sensor;
  if (typeof reading == 'undefined')
    return res.json({err: 'Invalid or missing parameters'});
  var query = {name: reading};
  if (typeof data.readout_interval != 'undefined') {
    try{
      updates['readout_interval'] = parseFloat(data.readout_interval);
    }catch(err) {
      console.log(err.message);
    }
  }
  if (typeof data.status != 'undefined' && (data.status == "online" || data.status == "offline"))
    updates['status'] = data.status;
  if (typeof data.runmode != 'undefined')
    updates['runmode'] = data.runmode;
  var promises = [];
  if (Object.keys(updates).length != 0)
    promises.push(req.db.readings.update({sensor: sensor, name: reading}, {$set: updates}));
  if (typeof data.alarms != 'undefined' && data.alarms.length != 0) {
    // TODO finish and/or make own endpoint
  }
  if (promises.length > 0) {
    Promise.all(promises)
    .then(() => res.json({msg: 'Success'}))
    .catch(err => {console.log(err.message); return res.json({err: err.message});});
  } else
    return res.json({});
});

router.get("get_data", function(req, res) {
  var q = url.parse(req.url, true).query;
  var reading = q.reading;
  var binning = q.binning;
  var history = q.history;

  if (typeof reading == 'undefined')
    return res.json([]);

  var url = "";

  // TODO finish here

  axios.get(url)
  .then(response => {

  }).catch(err => {console.log(err); res.send({err: err});});
});

router.get('get_last_point', function(req, res) {
  var reading = url.parse(req.url, true).query.reading;
  if (typeof reading == 'undefined')
    return res.json({});
  var url = ""

  // TODO ask influx
});

module.exports = router;
