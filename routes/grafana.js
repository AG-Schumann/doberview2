var express = require('express');
var url = require('url');
var router = express.Router();
var common = require('./common');

router.get('/', function(req, res) {
  var q = url.parse(req.url, true).query;
  var config = common.GetRenderConfig(req);
  config.grafana_url = process.env.GRAFANA_URL;
  res.render('grafana', config);
});

module.exports = router;
