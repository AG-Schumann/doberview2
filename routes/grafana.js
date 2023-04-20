var express = require('express');
var url = require('url');
var router = express.Router();
var common = require('./common');
const config = require('../config/config_pancake');

router.get('/', function(req, res) {
  var q = url.parse(req.url, true).query;
  var render_config = common.GetRenderConfig(req);
  render_config.grafana_url = config.grafana_url;
  res.render('grafana', render_config);
});

module.exports = router;
