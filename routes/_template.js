var express = require('express');
var url = require('url');
var router = express.Router();

// this won't actually do anything but it provides you a template
// for starting routers for new pages

router.get('/', function(req, res) {
  var q = url.parse(req.url, true).query;
  res.render('template', { param: value });
});

router.get('/get_url', function(req, res) {
  var now = new Date();
  req.db.get('collection').find({}, {projection: {}})
  .then(docs => res.json(docs))
  .catch(err => {console.log(err.message); return res.json([]);});
});

router.post('/post_url', function(req, res) {
  var doc = req.body.doc;
  req.db.get('collection').insert(doc)
  .then(() => res.json({}))
  .catch(err => {console.log(err.message); return res.json({err: err.message});});
});

module.exports = router;
