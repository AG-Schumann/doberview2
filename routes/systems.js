var express = require('express');
var url = require('url');
var router = express.Router();
var common = require('./common');
const monk = require("monk");

router.get('/', function(req, res) {
  global.db = monk(`${uri_base}/${experiment}`, {authSource: authdb});
  var q = url.parse(req.url, true).query;
  var config = common.GetRenderConfig(req);
  res.render('systems', config);
});

module.exports = router;
