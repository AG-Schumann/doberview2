var express = require('express');
var url = require('url');
var router = express.Router();

router.get('/', function(req, res) {
  var q = url.parse(req.url, true).query;
  res.render('logs', {});
});

router.get('/get_logs', function(req, res) {
  var q = url.parse(req.url, true).query;
  var limit = q.limit || 100;
  var match = {};
  if (typeof q.severity != 'undefined') {
    match['level'] = {$gte: parseInt(q.severity)};
  }
  if (typeof q.name != 'undefined') {
    match['name'] = {name: q.name};
  }
  req.log_db.get('logs').aggregate([
    {$match: match},
    {$sort: {_id: -1}},
    {$limit: limit},
    {$addFields: {logged: {$dateToString: {date: {$toDate: '$_id'}}}}}
  ]).then(docs => res.json(docs))
  .catch(err => {console.log(err.message); return res.json([]);});
});

module.exports = router;
