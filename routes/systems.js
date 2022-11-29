var express = require('express');
var url = require('url');
var router = express.Router();
var common = require('./common');

router.get('/', function(req, res) {
  let session = req.session;
  if(session.experiment){
    db = common.GetMongoDb({exp: session.experiment});
  } else
    res.redirect('../');
  var q = url.parse(req.url, true).query;
  var config = common.GetRenderConfig(req);
  res.render('systems', config);
});

module.exports = router;
