var express = require('express');
var url = require('url');
var axios = require('axios').default;
var router = express.Router();

router.get('/host_detail', function(req, res) {
    var q = url.parse(req.url, true).query;
    var host = q.host;
    if (typeof host == 'undefined')
        return res.json({});
    req.common_db.get('hosts').findOne({hostname: host})
        .then(doc => res.json(doc))
        .catch(err => {console.log(err.message); return res.json({err: err.message});});
});

router.get('/get_hosts', function(req, res) {
    req.common_db.get('hosts').find({}, {sort: {hostname: 1}}
    ).then(docs => res.json(docs))
        .catch(err => {console.log(err.message); return res.json([]);});
});
module.exports = router;
