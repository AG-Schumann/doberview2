var express = require('express');
var url = require('url');
var router = express.Router();

router.get('/', function(req, res) {
  var q = url.parse(req.url, true).query;
  res.render('systems', {experiment: process.env.DOBERVIEW_EXPERIMENT});
});

module.exports = router;
