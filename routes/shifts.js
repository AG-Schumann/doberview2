var express = require('express');
var url = require('url');
var router = express.Router();
var common = require('./common');

function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) { return next(); }
  res.redirect('/?notify_msg=You must be logged in to do that&notify_status=error');
}

router.get('/', ensureAuthenticated, function(req, res) {
  var config = common.GetRenderConfig(req);
  res.render('shifts', config);
});

router.get('/on_shift', function (req, res) {
  req.db.get('contacts').find({on_shift: true})
      .then(docs => res.json(docs))
      .catch(err => {console.log(err.message); return res.json([]);});
});

router.get('/get_contacts', function(req, res) {
  req.db.get('contacts').find({}, {projection: {name: 1, on_shift: 1}})
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
  var shifters = req.body.shifters;
  if (typeof shifters == 'undefined' || shifters.length === 0)
    return res.json({err: 'No input received'});
  var coll = req.db.get('contacts');
  coll.update({name: {$in: shifters}}, {$set: {on_shift: true}}, {multi: true})
  .then(() => coll.update({name: {$nin: shifters}}, {$set: {on_shift: false}}, {multi: true}))
  .then(() => res.json({}))
  .catch(err => {console.log(err.message); return res.json({err: err.message});});
});

router.post('/update_shifter', function(req, res) {
  var shifter = req.body;
  shifter.name = shifter.first_name + shifter.last_name[0];
  shifter.expert = shifter.expert === "true";
  shifter.on_shift = shifter.on_shift === "true";
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
