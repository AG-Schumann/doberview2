var express = require('express');
var url = require('url');
var router = express.Router();

router.get('/', function(req, res) {
  var q = url.parse(req.url, true).query;
  res.render('template', { param: value });
});

router.post('/post_url', function(req, res) {
  var doc = req.body.doc;
  req.db.get('collection').insert(doc)
  .then(() => res.json({}))
  .catch(err => {console.log(err.message); return res.json({err: err.message});});
});

module.exports = router;
