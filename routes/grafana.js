var express = require('express');
var url = require('url');
var router = express.Router();
var common = require('./common');

router.get('/', function(req, res) {
  var q = url.parse(req.url, true).query;
  var config = common.GetRenderConfig(req);
  config.grafana_url = 'http://10.4.73.172:3000/d/rRzTBhwZk/pancake-slowcontrol?orgId=1&refresh=5s&kiosk=tv';
  res.render('grafana', config);
});

module.exports = router;
