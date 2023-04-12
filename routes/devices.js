var express = require('express');
var url = require('url');
var axios = require('axios').default;
var router = express.Router();
var common = require('./common');
const topic_lut = {T: 'temperature', L: 'level', F: 'flow', M: 'weight', P: 'pressure', W: 'power', S: 'status', V: 'voltage', D: 'time', X: 'other', I: 'current', C: 'capacity'};

router.get('/', function(req, res) {
  var config = common.GetRenderConfig(req);
  res.render('full_system', config);
});

router.get('/params', function(req, res) {
  var ret = {};
  mongo_db.get('experiment_config').findOne({name: 'doberview_config'})
  .then(doc => {
    ret['subsystems'] = doc.subsystems.map(ss => ss[0]);
    ret['topics'] = doc.topics;
    return res.json(ret);
  }).catch(err => {console.log(err.message); return res.json({});});
});

router.post('/new_sensor', common.ensureAuthenticated, function(req, res) {
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
  mongo_db.get('sensors').aggregate([
    {$match: {subsystem: subsystem, topic: topic}},
    {$addFields: {number: {$toInt: {$arrayElemAt: [{$split: ['$name', '_']}, 2]}}}},
    {$group: {_id: null, number: {$max: '$number'}}}
  ]).then(docs => {
    if (docs.length != 0)
      num = ('00' + (docs[0].number+1)).slice(-2);
    return mongo_db.get('experiment_config').findOne({name: 'doberview_config'});
  }).then(sdoc => {
    var ss = sdoc.subsystems.filter(row => row[0] == subsystem)[0][1];
    doc.name = `${topic_abb}_${ss}_${num}`;
    return mongo_db.get('sensors').insert(doc);
  }).then(() => mongo_db.get('devices').update({name: doc.device}, {$addToSet: {sensors: doc.name}}))
    .then(() => res.json({name: doc.name}))
  .catch(err => {console.log(err.message); return res.json({err: err.message});});
});

router.get('/device_list', function(req, res) {
  mongo_db.get('devices').distinct('name')
  .then(docs => res.json(docs))
  .catch(err => {console.log(err.message); res.json([]);});
});

router.get('/device_detail', function(req, res) {
  var q = url.parse(req.url, true).query;
  var device = q.device;
  if (typeof device == 'undefined')
    return res.json({});
  mongo_db.get('devices').findOne({name: device})
  .then(doc => res.json(doc))
  .catch(err => {console.log(err.message); return res.json({err: err.message});});
});

router.get('/sensors_grouped', function(req, res) {
  var q = url.parse(req.url, true).query;
  var group_by = q.group_by;
  if (typeof group_by == 'undefined')
    return res.json([]);
  mongo_db.get('sensors').aggregate([
    {$sort: {'name': 1}},
    {$group: {
      _id: '$' + group_by,
      sensors: {$push: {
        name: '$name',
        desc: '$description',
        units: '$units',
        status: '$status'
      }}
    }},
    {$sort: {_id: 1}}
  ]).then(docs => res.json(docs))
  .catch(err => {console.log(err.message); return res.json([]);});
});

router.get('/sensor_list', function(req, res) {
  mongo_db.get('sensors').distinct('name')
  .then(docs => res.json(docs))
  .catch(err => {console.log(err.message); res.json([]);});
});

router.get('/sensor_detail', function(req, res) {
  var q = url.parse(req.url, true).query;
  var sensor = q.sensor;
  if (typeof sensor == 'undefined')
    return res.json({});
  mongo_db.get('sensors').findOne({name: sensor})
  .then(doc => res.json(doc))
  .catch(err => {console.log(err.message); return res.json({err: err.message});});
});

router.post('/update_device_address', common.ensureAuthenticated, function(req, res) {
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
    mongo_db.get('devices').update({device: device}, {$set: updates})
      .then(() => res.json({msg: 'Success'}))
      .catch(err => {console.log(err.message); return res.json({err: err.message});});
  } else
    return res.json({});
});

router.post('/update_alarm', common.ensureAuthenticated, function(req, res) {
  var data = req.body;
  var updates = {};
  var ret = {notify_msg: 'Alarm updated', notify_status: 'success'};
  if (typeof data.sensor == 'undefined') {
    return res.json({err: 'Invalid or missing parameters'});
  }
  if (typeof data.thresholds != 'undefined' && data.thresholds.length == 2) {
    try{
      updates['alarm_thresholds'] = data.thresholds.map(parseFloat);
      updates['alarm_recurrence'] = parseInt(data.recurrence);
      updates['alarm_level'] = parseInt(data.level);
    }catch(err) {
      return res.json({err: 'Invalid alarm parameters'});
    }
  }
  mongo_db.get('sensors').update({name: data.sensor}, {$set: updates})
    .then(() => res.json({ret}))
    .catch(err => {console.log(err.message); return res.json({err: err.message});});
});

router.post('/update_sensor', common.ensureAuthenticated, function(req, res) {
  var updates = {};
  var data = req.body;
  var sensor = data.sensor;
  var ret = {notify_msg: 'Sensor updated', notify_status: 'success'};
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
  mongo_db.get('sensors').update({name: sensor}, {$set: updates})
    .then(() => res.json(ret))
    .catch(err => {console.log(err.message); return res.json({err: err.message});});
});

router.get('/get_last_point', function(req, res) {
  var q = url.parse(req.url, true).query;
  var sensor = q.sensor;
  var topic = topic_lut[sensor.split('_')[0]];
  if (typeof sensor == 'undefined' || typeof topic == 'undefined')
    return res.json({});
  mongo_db.get('experiment_config').findOne({name: 'influx'}).then((doc) => {
    var get_url = new url.URL(doc['url'] + '/api/v2/query');
    var params = new url.URLSearchParams({
      org: doc['org'],
      db: doc['db'],
    });
    get_url.search = params.toString();
    return axios.post(
      get_url.toString(),
        `from(bucket: "${doc['bucket']}")
        |> range(start: -24h)
        |> filter(fn: (r) => r["_measurement"] == "${topic}")
        |> filter(fn: (r) => r["_field"] == "value")
        |> filter(fn: (r) => r["sensor"] == "${sensor}")
        |> keep(columns:["_time", "_value",])
        |> last()`,
        {
          'headers': {
            'Accept': 'application/csv',
            'Authorization': `Token ${doc['token']}`,
            'Content-type': 'application/vnd.flux'
          },
        })}).then(resp => {
    if (resp.data.split('\r\n').length > 1) {
      var blob = resp.data.split('\r\n')[1].split(',');
      return res.json({
        'value': blob[4],
        'time_ago': ((new Date() - new Date(blob[3])) / 1000).toFixed(1),
        'time': parseInt(blob[3]) / 1e6})
    }
    else {
      return res.json({'value': 'None', 'time_ago': 'None '})
    }
  }).catch(err => {console.log(err); return res.json({});});
});

router.get('/get_last_points', function(req, res) {
  // Get last value recorded by each sensor
  // Only searches past 24 hours
  // Optional get argument "sensors": a comma separated list of sensors to get data for
  // If sensors is not defined, returns data for all sensors
  var q = url.parse(req.url, true).query;
  //var q = req.body;
  var defstring = "";
  var filterstring = "";
  if (q.sensors) {
    defstring = `sensors = ${JSON.stringify(q.sensors.split(','))}`;
    filterstring = '|> filter(fn: (r) => contains(value: r.sensor, set: sensors))';
  }
  db.get('experiment_config').findOne({name: 'influx'}).then((doc) => {
    var get_url = new url.URL(doc['url'] + '/api/v2/query');
    var params = new url.URLSearchParams({
      org: doc['org'],
      db: doc['db'],
    });
    get_url.search = params.toString();
    //res.json(q);
    return axios.post(
      get_url.toString(),
        `${defstring}
        from(bucket: "${doc['bucket']}")
        |> range(start: -24h)
        |> group(columns: ["sensor"])
        |> keep(columns:["_time", "_value","sensor"])
        |> last()
        ${filterstring}`,
        {
          'headers': {
            'Accept': 'application/csv',
            'Authorization': `Token ${doc['token']}`,
            'Content-type': 'application/vnd.flux'
          },
        })}).then(resp => {
          const lines = resp.data.split('\r\n');
          const keys = lines[0].split(',');
          const value_index = keys.indexOf('_value');
          const time_index = keys.indexOf('_time');
          const sensor_index = keys.indexOf('sensor');
          return res.json(lines.slice(1).reduce((result, line) => {
            if ((line.length > 0) & (!line.includes('_value'))) {
              // Sometimes Influx sends extra header lines!
              const v = line.split(',');
              result[v[sensor_index]] = {
                'value': v[value_index],
                'sensor': v[sensor_index],
                'time': v[time_index],
                'time_ago': ((new Date() - new Date(v[time_index])) / 1000).toFixed(1),
              };
            }
            return result;
          }, {}));
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
  mongo_db.get('experiment_config').findOne({name: 'influx'}).then((doc) => {
    var get_url = new url.URL(doc['url'] + '/api/v2/query');
    var params = new url.URLSearchParams({
      org: doc['org'],
      db: doc['db'],
    });
    get_url.search = params.toString();
    return axios.post(
        get_url.toString(),
        `from(bucket: "${doc['bucket']}")
        |> range(start: -${history})
        |> filter(fn: (r) => r["_measurement"] == "${topic}")
        |> filter(fn: (r) => r["_field"] == "value")
        |> filter(fn: (r) => r["sensor"] == "${sensor}")
        |> keep(columns:["_time", "_value",])
        |> aggregateWindow(every: ${binning}, fn: mean, createEmpty: false)
        |> yield(name: "mean")`,
        {
          'headers': {
            'Accept': 'application/csv',
            'Authorization': `Token ${doc['token']}`,
            'Content-type': 'application/vnd.flux'
          },
        })}).then(resp => {
          var data = resp.data.split('\r\n').slice(1);
          return res.json(data.map(row => {var x = row.split(','); return [new Date(x[6]).getTime(), parseFloat(x[5])];}));
  }).catch(err => {console.log(err); return res.json([]);});
});

module.exports = router;
