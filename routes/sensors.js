var express = require('express');
var url = require('url');
var axios = require('axios').default;
var router = express.Router();

const reading_lut = {T: 'temperature', L: 'level', F: 'flow', M: 'weight', P: 'pressure', W: 'power', S: 'status', V: 'voltage'};
const influx_url = process.env.DOBERVIEW_INFLUX_URI;

function axios_params(var query) {
  var get_url = new url.URL(influx_url);
  var params = new url.URLSearchParams({
    db: process.env.DOBERVIEW_EXPERIMENT,
    org: process.env.DOBERVIEW_ORG,
    q: query
  });
  get_url.search=params.toString();
  return {
    url: get_url.toString(),
    method: 'get',
    headers: {'Accept': 'application/csv', 'Authorization': `Token ${process.env.INFLUX_TOKEN}`},
  };
}

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
  if (typeof data.alarm != 'undefined' && data.alarm.length == 2) {
    updates['alarm'] = [data.alarm[0], data.alarm[1]];
    updates['alarm_recurrence'] = data.alarm_recurrence;
  }
  req.db.get('readings').update({sensor: sensor, name: reading}, {$set: updates})
    .then(() => res.json({msg: 'Success'}))
    .catch(err => {console.log(err.message); return res.json({err: err.message});});
});

router.get('/get_last_point', function(req, res) {
  var q = url.parse(req.url, true).query;
  var reading = q.reading;
  var topic = reading_lut[reading.split('_')[0]];
  if (typeof reading == 'undefined' || typeof topic == 'undefined')
    return res.json({});

  axios(axios_params(`SELECT last(value) FROM ${topic} WHERE reading='${reading}';`)).
  then(resp => {
    var blob = resp.data.split('\n')[1].split(',');
    return res.json({'value': parseFloat(blob[3]), 'time_ago': ((new Date()-parseInt(blob[2])/1e6)/1000).toFixed(1)});
  }).catch(err => {console.log(err); return res.json([]);});
});

router.get('/get_data', function(req, res) {
  var q = url.parse(req.url, true).query;
  var reading = q.reading;
  var binning = q.binning;
  var history = q.history;
  var topic = reading_lut[reading.split('_')[0]];
  if (typeof reading == 'undefined' || typeof binning == 'undefined' || typeof history == 'undefined' || typeof topic == 'undefined')
    return res.json([]);

  axios(axios_params(`SELECT mean(value) FROM ${topic} WHERE reading='${reading}' AND time > now()-${history} GROUP BY time(${binning}) fill(none);`))
  .then( blob => {
    var data = blob.data.split('\n').slice(1);
    return res.json(data.map(row => {var x = row.split(','); return [parseFloat(x[2]/1e6), parseFloat(x[3])];}));
  }).catch(err => {console.log(err); return res.json([]);});
});

module.exports = router;
