var express = require('express');
var url = require('url');
var router = express.Router();
var common = require('./common');
var config = require('../config/config');

router.get('/', function(req, res) {
  var render_config = common.GetRenderConfig(req);
  render_config.main_svg = config.main_svg;
  res.render('systems', render_config);
});

module.exports = router;
