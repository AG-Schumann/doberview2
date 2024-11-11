var express = require('express');
var router = express.Router();
const common = require("./common");
const url = require("url");

router.get('/', function(req, res) {
    var config = common.GetRenderConfig(req);
    res.render('plotter', config);
});

router.get('/get_templates', function(req, res) {
    mongo_db.get('plotter_templates').distinct('name')
        .then(docs => res.json(docs))
        .catch(err => {console.log(err.message); res.json([]);});
});

router.get('/get_sensors', function (req,res) {
    let q = url.parse(req.url, true).query;
    let name = q.name;
    mongo_db.get('plotter_templates').findOne({'name': name})
        .then(doc => res.json(doc.sensors))
        .catch(err => {console.log(err.message); res.json([]);});

})
router.post('/save_template', common.ensureAuthenticated, function(req, res) {
    let data = req.body;
    let name = data.name;
    let sensors = data.sensors;
    let ret = {notify_msg: 'Template saved', notify_status: 'success'};
    mongo_db.get('plotter_templates').insert({name: name, sensors: sensors})
        .then(() => res.json(ret))
        .catch(err => {console.log(err.message); return res.json({err: err.message});});
});

module.exports = router;