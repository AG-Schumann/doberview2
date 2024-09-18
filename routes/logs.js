var express = require('express');
var url = require('url');
var router = express.Router();
var common = require('./common');

router.get('/', function(req, res) {
  var config = common.GetRenderConfig(req);
  res.render('logs', config);
});

router.get('/get_logs', function(req, res) {
  const q = url.parse(req.url, true).query;
  let limit = 10000;
  let tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  console.log(tz);

  if (typeof q.limit !== "undefined") {
    limit = parseInt(q.limit, 10);
  }

  let match = {};

  if (typeof q.from !== 'undefined' && typeof q.to !== 'undefined') {
    match['_id'] = {
      $gte: new Date(q.from),
      $lt: new Date(q.to)
    };
  }

  if (typeof q.severity !== 'undefined') {
    match['level'] = {$gte: parseInt(q.severity, 10)};
  }

  if (typeof q.name !== 'undefined' && q.name !== "") {
    match['name'] = q.name;
  }

  mongo_db.get('logs').aggregate([
    {$match: match},
    {$sort: {_id: -1}},
    {$limit: limit},
    {
      $project: {
        name: 1,
        level: 1,
        msg: 1,
        funcname: 1,
        date: {
          $dateToString: {
            date: { $toDate: "$_id" },
            timezone: tz,
            format: "%Y-%m-%d %H:%M:%S"
          }
        },
        _id: 0
      }
    }
  ])
      .then(docs => res.json(docs))
      .catch(err => {
        console.log(err.message);
        return res.json([]);
      });
});

module.exports = router;


module.exports = router;
