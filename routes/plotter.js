var express = require('express');
var router = express.Router();
const common = require("./common");

router.get('/', function(req, res) {
    var config = common.GetRenderConfig(req);
    res.render('plotter', config);
});

module.exports = router;