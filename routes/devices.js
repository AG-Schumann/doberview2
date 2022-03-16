var express = require('express');
var url = require('url');
var axios = require('axios').default;
var router = express.Router();

const topic_lut = {T: 'temperature', L: 'level', F: 'flow', M: 'weight', P: 'pressure', W: 'power', S: 'status', V: 'voltage', D: 'time', X: 'other', I: 'current', C: 'capacity'};

function axios_params(query) {
  var get_url = new url.URL(process.env.DOBERVIEW_INFLUX_URI);
  var params = new url.URLSearchParams({
    db: process.env.DOBERVIEW_INFLUX_DATABASE,
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

router.get('/params', function(req, res) {
  var ret = {};
  req.db.get('experiment_config').findOne({name: 'doberview_config'})
  .then(doc => {
    ret['subsystems'] = doc.subsystems.map(ss => ss[0]);
    ret['topics'] = doc.topics;
    return res.json(ret);
  }).catch(err => {console.log(err.message); return res.json({});});
});

router.post('/new_sensor', function(req, res) {
  var doc = req.body;
  doc.status = 'online';
  var topic = doc.topic;
  if (!Object.values(topic_lut).includes(topic))
    return res.json({err: `Invalid topic: ${topic} ${Object.values(topic_lut).join(',')}`});
  var topic_abb = Object.entries(topic_lut).filter(kv => kv[1] == topic)[0][0];
  if (typeof doc.value_xform != 'undefined') {
    try{
      doc.value_xform = doc.value_xform.split(',').map(parseFloat);
    }catch(error){
      console.log(error.message);
      return res.json({err: error.message});
    }
    if (doc.value_xform.length < 2) {
      console.log('Invalid value xform');
      return res.json({err: error.message});
    }
  }
  doc.readout_interval = parseFloat(doc.readout_interval);
  if (typeof doc.is_int != 'undefined')
    doc.is_int = parseInt(doc.is_int);
  var subsystem = doc.subsystem;
  var num = '01';
  var name;
  req.db.get('sensors').aggregate([
    {$match: {subsystem: subsystem, topic: topic}},
    {$addFields: {number: {$toInt: {$arrayElemAt: [{$split: ['$name', '_']}, 2]}}}},
    {$group: {_id: null, number: {$max: '$number'}}}
  ]).then(docs => {
    if (docs.length != 0)
      num = ('00' + (docs[0].number+1)).slice(-2);
    return req.db.get('experiment_config').findOne({name: 'doberview_config'});
  }).then(sdoc => {
    var ss = sdoc.subsystems.filter(row => row[0] == subsystem)[0][1];
    doc.name = `${topic_abb}_${ss}_${num}`;
    return req.db.get('sensors').insert(doc);
  }).then(() => req.db.get('devices').update({name: doc.device}, {$addToSet: {sensors: doc.name}}))
    .then(() => res.json({name: doc.name}))
  .catch(err => {console.log(err.message); return res.json({err: err.message});});
});

router.get('/device_list', function(req, res) {
  req.db.get('devices').distinct('name')
  .then(docs => res.json(docs))
  .catch(err => {console.log(err.message); res.json([]);});
});

router.get('/device_detail', function(req, res) {
  var q = url.parse(req.url, true).query;
  var device = q.device;
  if (typeof device == 'undefined')
    return res.json({});
  req.db.get('devices').findOne({name: device})
  .then(doc => res.json(doc))
  .catch(err => {console.log(err.message); return res.json({err: err.message});});
});

router.get('/sensors_grouped', function(req, res) {
  var q = url.parse(req.url, true).query;
  var group_by = q.group_by;
  if (typeof group_by == 'undefined')
    return res.json([]);
  req.db.get('sensors').aggregate([
    {$sort: {'name': 1}},
    {$group: {
      _id: '$' + group_by,
      sensors: {$push: {name: '$name', desc: '$description', units: '$units'}}
    }},
    {$sort: {_id: 1}}
  ]).then(docs => res.json(docs))
  .catch(err => {console.log(err.message); return res.json([]);});
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

router.post('/update_device_address', function(req, res) {
  var updates = {};
  var data = req.body.data;
  var device = data.device;
  if (typeof device == 'undefined')
    return res.json({err: 'No device defined'});
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
    req.db.get('devices').update({device: device}, {$set: updates})
      .then(() => res.json({msg: 'Success'}))
      .catch(err => {console.log(err.message); return res.json({err: err.message});});
  } else
    return res.json({});
});

router.post('/update_alarm', function(req, res) {
  var data = req.body;
  var updates = {};
  if (typeof data.sensor == 'undefined') {
    console.log(req.body);
    return res.json({err: 'Invalid or missing parameters'});
  }
  if (typeof data.thresholds != 'undefined' && data.thresholds.length == 2) {
    try{
      updates['alarm_thresholds'] = data.thresholds.map(parseFloat);
      updates['alarm_recurrence'] = parseInt(data.recurrence);
      updates['alarm_level'] = parseInt(data.level);
    }catch(err) {
      console.log(err.message);
      return res.json({err: 'Invalid alarm parameters'});
    }
  }
  console.log(updates);
  req.db.get('sensors').update({name: data.sensor}, {$set: updates})
    .then(() => res.json({}))
    .catch(err => {console.log(err.message); return res.json({err: err.message});});
});

router.post('/update_sensor', function(req, res) {
  var updates = {};
  var data = req.body;
  var sensor = data.sensor;
  var ret = {msg: 'Success'};
  if (typeof sensor == 'undefined') {
    console.log(req.body);
    return res.json({err: 'Invalid or missing parameters'});
  }
  if (typeof data.value_xform != 'undefined') {
    try{
      var xform = data.value_xform.split(',').map(parseFloat);
    }catch(error){
      console.log(error.message);
      console.log(data.value_xform);
      return res.json({err: 'Invalid value transform'});
    }
    if (xform.length < 2) {
      console.log('Invalid value xform ' + data.value_xform);
      return res.json({err: 'Invalid value transform'});
    }
    updates['value_xform'] = xform;
  }
  if (typeof data.readout_interval != 'undefined') {
    try{
      updates['readout_interval'] = parseFloat(data.readout_interval);
    }catch(err) {
      console.log(err.message);
      return res.json({err: 'Invalid readout interval'});
    }
  }
  if (typeof data.status != 'undefined' && (data.status == "online" || data.status == "offline"))
    updates['status'] = data.status;
  if (typeof data.description != 'undefined' && data.description != "")
    updates['description'] = data.description;
  console.log(updates);
  req.db.get('sensors').update({name: sensor}, {$set: updates})
    .then(() => res.json(ret))
    .catch(err => {console.log(err.message); return res.json({err: err.message});});
});

router.get('/get_last_point', function(req, res) {
  var q = url.parse(req.url, true).query;
  var sensor = q.sensor;
  var topic = topic_lut[sensor.split('_')[0]];
  if (typeof sensor == 'undefined' || typeof topic == 'undefined')
    return res.json({});

  axios(axios_params(`SELECT last(value) FROM ${topic} WHERE sensor='${sensor}';`))
  .then(resp => {
    var blob = resp.data.split('\n')[1].split(',');
    return res.json({'value': blob[3], 'time_ago': ((new Date()-parseInt(blob[2])/1e6)/1000).toFixed(1)});
  }).catch(err => {console.log(err); return res.json({});});
});

router.get('/get_data', function(req, res) {
  var q = url.parse(req.url, true).query;
  var sensor = q.sensor;
  var binning = q.binning;
  var history = q.history;
  var topic = topic_lut[sensor.split('_')[0]];
  if (typeof sensor == 'undefined' || typeof binning == 'undefined' || typeof history == 'undefined' || typeof topic == 'undefined')
    return res.json([]);

  axios(axios_params(`SELECT mean(value) FROM ${topic} WHERE sensor='${sensor}' AND time > now()-${history} GROUP BY time(${binning}) fill(none);`))
  .then( blob => {
    var data = blob.data.split('\n').slice(1);
    return res.json(data.map(row => {var x = row.split(','); return [parseFloat(x[2]/1e6), parseFloat(x[3])];}));
  }).catch(err => {console.log(err); return res.json([]);});
});

module.exports = router;
