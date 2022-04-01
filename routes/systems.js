var express = require('express');
var url = require('url');
var router = express.Router();
var common = require('./common');

router.get('/', function(req, res) {
  var q = url.parse(req.url, true).query;
  var config = common.GetRenderConfig(req);
  config.experiment = process.env.DOBERVIEW_EXPERIMENT;
  res.render('systems', config);
});

module.exports = router;
