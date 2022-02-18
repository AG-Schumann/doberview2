var express = require('express');
var url = require('url');
var router = express.Router();

router.get('/', function(req, res) {
  res.render('shifts');
});

router.get('/get_contacts', function(req, res) {
  var now = new Date();
  req.db.get('contacts').find({}, {projection: {name: 1, status: 1}})
  .then(docs => res.json(docs))
  .catch(err => {console.log(err.message); return res.json([]);});
});

router.get('/contact_detail', function(req, res) {
  var q = url.parse(req.url, true).query;
  if (typeof q.name == 'undefined')
    return res.json({});
  var name = q.name;
  req.db.get('contacts').findOne({name: name})
  .then(doc => res.json(doc))
  .catch(err => {console.log(err.message); return res.json({err: err.message});});
});

router.post('/set_shifters', function(req, res) {
  var shifts = req.body.shifts;
  if (typeof shifts == 'undefined' || shifts.length == 0)
    return res.json({err: "No input received"});
  var onshift = shifts.filter(row => row[1] > 0).map(row => row[0]);
  var now = new Date();
  var forever = new Date();
  forever.setFullYear(forever.getFullYear()+1);
  var coll = req.db.get('shifts');
  var key = `${now.getFullYear()}-${('0'+now.getMonth()).slice(-2)}-${('0'+now.getDate()).slice(-2)}`
  coll.findOne({start: {$lt: now}, end: {$gt: now}})
  .then(current_shift => {
    // first we end the current shift
    if (typeof current_shift != 'undefined' && current_shift != null)
      return shifts.update({_id: last_shift._id}, {$set: {end: now}});
  }).then(() => shifts.insert({start: now, end: forever, shifters: onshift, key: key}))
  .then(() => res.json({}))
  .catch(err => {console.log(err.message); return res.json({err: err.message});});
});

router.post('/update_shifter', function(req, res) {
  var shifter = req.body;
  shifter.name = shifter.first_name + shifter.last_name[0];
  req.db.get('contacts').update({name: shifter.name}, {$set: shifter}, {upsert: true})
  .then(() => res.json({}))
  .catch(err => {console.log(err.message); return res.json({err: err.message});});
});

router.post('/delete_shifter', function(req, res) {
  var name = req.body.name;
  req.db.get('contacts').remove({name: name})
  .then(() => res.json({}))
  .catch(err => {console.log(err.message); return res.json({err: err.message});});
});

module.exports = router;
