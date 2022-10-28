var express = require('express');
var url = require('url');
var router = express.Router();
var common = require('./common');

router.get('/', function(req, res) {
  var q = url.parse(req.url, true).query;
  var config = common.GetRenderConfig(req);
  res.render('logs', config);
});

router.get('/get_logs', function(req, res) {
  var q = url.parse(req.url, true).query;
  var limit = 10000; // hard limit
  if(typeof q.limit != "undefined") {
    limit = parseInt(q.limit);
  }
  var match = {};
  if (typeof q.from != 'undefined' && typeof q.to != 'undefined') {
    q.from.replace('%2B', 'T');
    q.from.replace('%3A', ':');
    q.to.replace('%2B', 'T');
    q.to.replace('%3A', ':');
    q.from = q.from + ' UTC';
    q.to = q.to + ' UTC';
    match['date'] = {$gte:new Date(q.from), $lt:new Date(q.to)};
  }
  if (typeof q.severity != 'undefined') {
    match['level'] = {$gte: parseInt(q.severity)};
  }
  if (typeof q.name != 'undefined' && q.name != "") {
    match['name'] = q.name;
  }
  req.db.get('logs').aggregate([
    {$match: match},
    {$sort: {_id: -1}},
    {$limit: limit},
    {$project: {name: 1, level: 1, msg: 1, funcname: 1, logged: {$dateToString: {date: {$toDate: '$_id'}}}, _id: 0}}
  ]).then(docs => res.json(docs))
  .catch(err => {console.log(err.message); return res.json([]);});
});

module.exports = router;
