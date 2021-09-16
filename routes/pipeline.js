var express = require('express');
var router = express.Router();

router.get('/', function(req, res, next) {
  var q = url.parse(req.url, true).query;
  res.render('pipeline', { load: q.pipeline_id });
});

router.get('get_pipelines', function(req, res) {
  req.db.get('pipelines').aggregate([{$group: {_id: '$status', names: {$push: '$name'}}}])
  .then(docs => res.json(docs))
  .catch(err => {console.log(err.message); return res.json([]);});
});

router.get('/get_pipeline_config', function(req, res) {

});

router.post('/add_new_pipeline', function(req, res) {

});

router.post('update_pipeline', function(req, res) {

});

module.exports = router;
