var express = require('express');
var url = require('url');
var router = express.Router();

router.get('/', function(req, res) {
  res.render('sensors', { title: 'Express' });
});

router.get('/sensor_list', function(req, res) {
  return res.json(req.db.distinct('sensors', 'name'));
});

router.get('/sensor_detail', function(req, res) {
  var q = url.parse(req.url, true).query;
  var sensor = q.sensor;
  if (typeof sensor == 'undefined')
    return res.json({});
  return res.json(req.db.getSensorDetail(sensor));
});

router.get('/reading_list', function(req, res) {
  return res.json(req.db.getReadingNames());
});

router.get('/reading_detail', function(req, res) {
  var q = url.parse(req.url, true).query;
  var reading = q.reading;
  if (typeof reading == 'undefined')
    return res.json({});
  return res.json(req.db.getReadingDetail(reading));
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
  return res.json(req.db.updateSensor(sensor, updates));
});

router.post('/update_reading', function(req, res) {

});

module.exports = router;
