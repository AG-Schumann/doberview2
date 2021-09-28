var express = require('express');
var url = require('url');
var axios = require('axios').default;
var router = express.Router();

const influx_url = `http://localhost:8086/query?u=${process.env.INFLUX_USERNAME}&p=${process.env.INFLUX_PASSWORD}&db=pancake`;
const reading_lut = {T: 'temperature', 'n2lm': 'level', F: 'flow', M: 'weight', P: 'pressure'};

router.get('/', function(req, res) {
  res.render('full_system');
});

router.get('/sensor_list', function(req, res) {
  req.db.get('sensors').distinct('name')
  .then(docs => res.json(docs))
  .catch(err => {console.log(err.message); res.json([]);});
});

router.get('/sensor_detail', function(req, res) {
  var q = url.parse(req.url, true).query;
  var sensor = q.sensor;
  if (typeof sensor == 'undefined')
    return res.json({});
  req.db.get('sensors').findOne({name: sensor})
  .then(doc => res.json(doc))
  .catch(err => {console.log(err.message); return res.json({err: err.message});});
});

router.get('/readings_grouped', function(req, res) {
  var q = url.parse(req.url, true).query;
  var group_by = q.group_by;
  if (typeof group_by == 'undefined')
    return res.json([]);
  req.db.get('readings').aggregate([
    {$group: {
      _id: '$' + group_by,
      readings: {$push: {name: '$name', desc: '$description'}}
    }},
    {$sort: {_id: 1}}
  ]).then(docs => res.json(docs))
  .catch(err => {console.log(err.message); return res.json([]);});
});

router.get('/reading_list', function(req, res) {
  req.db.get('readings').distinct('name')
  .then(docs => res.json(docs))
  .catch(err => {console.log(err.message); res.json([]);});
});

router.get('/reading_detail', function(req, res) {
  var q = url.parse(req.url, true).query;
  var reading = q.reading;
  if (typeof reading == 'undefined')
    return res.json({});
  req.db.get('readings').findOne({name: reading})
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
    req.db.get('sensors').update({sensor: sensor}, {$set: updates})
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
    promises.push(req.db.get('readings').update({sensor: sensor, name: reading}, {$set: updates}));
  if (promises.length > 0) {
    Promise.all(promises)
    .then(() => res.json({msg: 'Success'}))
    .catch(err => {console.log(err.message); return res.json({err: err.message});});
  } else
    return res.json({});
});

router.get('/get_last_point', function(req, res) {
  var q = url.parse(req.url, true).query;
  var reading = q.reading;
  var topic = reading_lut[reading.split('_')[0]];
  if (typeof reading == 'undefined' || typeof topic == 'undefined')
    return res.json({});
  var get_url = influx_url + `&q=SELECT last(${reading}) FROM ${topic};`;
  axios.get(get_url).then(
    data => res.json(data)
  ).catch(err => {console.log(err); return res.json([]);});
});

router.get('/get_data', function(req, res) {
  var q = url.parse(req.url, true).query;
  var reading = q.reading;
  var binning = q.binning;
  var history = q.history;
  var topic = reading_lut[reading.split('_')[0]];
  if (typeof reading == 'undefined' || typeof binning == 'undefined' || typeof history == 'undefined' || typeof topic == 'undefined')
    return res.json([]);

  var get_url = influx_url + `&q=SELECT ${reading} FROM ${topic} WHERE time > now()-${history} GROUP BY time(${binning});`;
  axios.get(get_url).then(
    data => res.json(data)
  ).catch(err => {console.log(err); return res.json([]);});
});

module.exports = router;
