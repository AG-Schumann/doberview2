var express = require('express');
var url = require('url');
var router = express.Router();

const influx_url = process.env.DOBERVIEW_INFLUX_URI;

function axios_params(var query) {
  var get_url = new url.URL(influx_url);
  var params = new url.URLSearchParams({
    db: 'sysmon',
    org: process.env.DOBERVIEW_ORG,
    q: query
  });
  get_url.search=params.toString();
  return {
    url: get_url.toString(),
    method: 'get',
    headers: {'Accept': 'application/csv', 'Authorization': `Token ${process.env.INFLUX_TOKEN}`},
  };
}

router.get('/', function(req, res) {
  var q = url.parse(req.url, true).query;
  res.render('hosts', {hosts: ['apollo', 'calliope'] });
});

router.get('/params', function(req, res) {
  return res.json({hosts: ['apollo', 'calliope']});
});

router.get('/get_snapshot', function(req, res) {
  var q = url.parse(req.url, true).query;
  var host = q.host;
  if (typeof host == 'undefined')
    return res.json({});

  axios(axios_params(`SELECT last(cpu_0_temp),last(load1),last(load5),last(load15),last(cpu0),last(cpu1),last(mem_avail) FROM sysmon WHERE host='${host}';`)).then(blob => {
    var data = blob.data.split('\n')[1].split(',');
    return res.json({'cpu_0_temp': parseFloat(data[3]),'load': [parseFloat(data[4]),parseFloat(data[5]),parseFloat(data[6])], 'top_cpu': [parseFloat(data[7]),parseFloat(data[8])], 'memory': parseFloat(data[9])});
  }).catch(err => {console.log(err); return res.json({});});
});

router.get('/get_history', function(req, res) {
  var q = url.parse(req.url, true).query;
  var host = q.host;
  if (typeof host == 'undefined')
    return res.json([]);

  axios(axios_params(`SELECT mean(cpu_0_temp),mean(load1) FROM sysmon WHERE host='${host}' AND time > now()-${history} GROUP BY time(${binning}) fill(none);`)).then( blob => {
    var data = blob.data.split('\n').slice(1);
    return res.json(data.map(row => {var x = row.split(','); return [parseFloat(x[2]/1e6), parseFloat(x[3]), parseFloat(x[4])];}));
  }).catch(err => {console.log(err); return res.json([]);});
});

module.exports = router;
