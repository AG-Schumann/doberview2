var express = require('express');
var url = require('url');
var axios = require('axios').default;
var router = express.Router();

router.get('/', function(req, res) {
    res.render('shifts');
});

router.get('/get_shifts', function (req, res) {
    var q = url.parse(req.url, true).query;
    var start = q.start;
    var end = q.end;
    req.db.get('shifts').aggregate([
        {$match: {"end": {$gte: new Date(start)}, "start": {$lte: new Date(end)}}},
        {$addFields: {"title": "$shifters"}}
        ])
        .then(docs => res.json(docs))
        .catch(err => {console.log(err.message); return res.json([]);});
});

router.get('/shift_detail', function (req, res) {
    var q = url.parse(req.url, true).query;
    var key = q.key;
    req.db.get('shifts').findOne({"key": key})
        .then(doc => res.json(doc))
        .catch(err => {console.log(err.message); return res.json([]);});
});

router.get('/get_current_shifters', function(req, res){
    var today = new Date();
    req.db.get('shifts').aggregate([
        {$match: {start: {$lte: today}, end: {$gte: today}}},
        {$lookup: {from: 'contacts', localField: 'shifters', foreignField: 'name', as: 'shifterdocs'}},
    ]).then(docs => res.json(docs))
        .catch(err => {console.log(err.message); return res.json([]);});
});

router.get('/shifter_detail', function (req, res) {
    var q = url.parse(req.url, true).query;
    var shifter = q.name;
    if (typeof shifter == 'undefined')
        return res.json({});
    req.db.get('contacts').findOne({name: shifter})
        .then(doc => res.json(doc))
        .catch(err => {console.log(err.message); return res.json({err: err.message});});
});

router.get('/contacts', function (req, res) {
    req.db.get('contacts').find({}, {sort: {"name": 1}})
        .then(docs => res.json(docs))
        .catch(err => {console.log(err.message); return res.json({err: err.message});});
});

module.exports = router;
