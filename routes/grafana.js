var express = require('express');
var url = require('url');
var router = express.Router();

router.get('/', function(req, res) {
  var q = url.parse(req.url, true).query;
  res.render('grafana', {grafana_url: 'http://10.4.73.172:3000/d/rRzTBhwZk/pancake-slowcontrol?orgId=1'});
});

module.exports = router;
