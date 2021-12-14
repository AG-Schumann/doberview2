var express = require('express');
var url = require('url');
var router = express.Router();
var axios = require('axios');

const influx_url = process.env.DOBERVIEW_INFLUX_URI;

function axios_params(query) {
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
  res.render('hosts', {hosts: ['apollo', 'calliope'], grafana_sysmon_url: 'http://10.4.73.172:3000/d/WzsbkBwWk/system-mon?orgId=1&kiosk'});
});

router.get('/params', function(req, res) {
  return res.json({hosts: ['apollo', 'calliope']});
});

router.get('/get_snapshot', function(req, res) {
  var q = url.parse(req.url, true).query;
  var host = q.host;
  if (typeof host == 'undefined')
    return res.json({});

  axios(axios_params(`SELECT last(*) FROM sysmon WHERE host='${host}';`))
  .then(blob => {
    var data = blob.data.split('\n');
    // strip last_ from all the names
    var fields = data[0].split(',').slice(3).map(s => s.substr("last_".length));
    var values = data[1].split(',').slice(3);
    var ret = {};
    for (var i in fields)
      ret[fields[i]] = values[i];
    return res.json(ret);
  }).catch(err => {console.log(err); return res.json({});});
});

router.get('/get_history', function(req, res) {
  var q = url.parse(req.url, true).query;
  var host = q.host;
  if (typeof host == 'undefined')
    return res.json([]);

  axios(axios_params(`SELECT mean(cpu_0_temp),mean(load1) FROM sysmon WHERE host='${host}' AND time > now()-${history} GROUP BY time(${binning}) fill(none);`))
  .then( blob => {
    var data = blob.data.split('\n').slice(1);
    return res.json(data.map(row => {var x = row.split(','); return [parseFloat(x[2]/1e6), parseFloat(x[3]), parseFloat(x[4])];}));
  }).catch(err => {console.log(err); return res.json([]);});
});

module.exports = router;
