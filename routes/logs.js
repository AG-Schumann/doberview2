var express = require('express');
var url = require('url');
var router = express.Router();

router.get('/', function(req, res) {
  var q = url.parse(req.url, true).query;
  res.render('logs', {});
});

router.get('/get_logs', function(req, res) {
  var q = url.parse(req.url, true).query;
  var limit = 100;
  try {
    limit = parseInt(q.limit);
  }catch(err) {}
  var match = {};
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
