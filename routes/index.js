var express = require('express');
var router = express.Router();

router.get('/', function(req, res) {
    if (req.session.experiment in experiments) {
        res.redirect('/devices');
    } else
    res.render('index');
});

router.post('/set_experiment', function(req, res) {
    let session = req.session;
    session.experiment = req.body.name;
    res.redirect('/devices');
});

module.exports = router;
