var express = require('express');
var url = require('url');
var router = express.Router();

router.get('/', function(req, res) {
  var q = url.parse(req.url, true).query;
  res.render('pipeline', { load: q.pipeline_id });
});

router.get('/get_pipelines', function(req, res) {
  req.db.get('pipelines').aggregate([{$group: {_id: '$status', names: {$push: '$name'}}}])
  .then(docs => res.json(docs))
  .catch(err => {console.log(err.message); return res.json([]);});
});

router.get('/get_pipeline', function(req, res) {
  var q = url.parse(req.url, true).query;
  if (typeof q.name == 'undefined')
    return res.json({});
  req.db.get('pipelines').findOne({name: q.name})
  .then(doc => res.json(doc))
  .catch(err => {console.log(err.message); return res.json({});});
});

router.post('/add_new_pipeline', function(req, res) {

});

router.post('/update_pipeline', function(req, res) {

});

router.get('/delete_pipeline', function(req, res) {

});

router.post('/pipeline_ctl', function(req, res) {
  var data = req.body.data;
});

module.exports = router;
