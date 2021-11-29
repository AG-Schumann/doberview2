var express = require('express');
var url = require('url');
var router = express.Router();

router.get('/', function(req, res) {
  var q = url.parse(req.url, true).query;
  res.render('pipeline', { load: q.pipeline_id });
});

router.get('/acknowledge', function(req, res) {
  var q = url.parse(req.url, true).query;
  var hash = q.alarm_id;
  if (typeof uuid == 'undefined')
    return res.send("");
  req.logging_db.get().find_one({hash: hash})
  .then(doc => {
    if (doc != null) {

    } else {
      throw({message: "Alarm already acknowledged"});
    }
  }).then(doc => {

  }).catch(err => {
      return res.send(err.message);
  });
});

module.exports = router;
