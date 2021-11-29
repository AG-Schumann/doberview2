var express = require('express');
var url = require('url');
var router = express.Router();

router.get('/', function(req, res) {
  var q = url.parse(req.url, true).query;
  res.render('pipeline', { load: q.pipeline_id });
});

router.post('/command', function(req, res) {
  var data = req.body;
  var doc = {};
  doc.target = data.target;
  doc.command = data.command;
  doc.logged = new Date(new Date() - (-doc.delay || 0));
  req.logging_db.get('commands').insert_one(doc)
  .then( () => res.json({}))
  .catch(err => {console.log(err.message); return res.json({err: err.message});});
}

module.exports = router;
