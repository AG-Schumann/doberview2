var express = require('express');
var url = require('url');
var router = express.Router();
var axios = require('axios');
var common = require('./common');
const config = require('../config/config');

router.get('/', function(req, res) {
  var render_config = common.GetRenderConfig(req);
  render_config.hosts = config.hosts;
  render_config.grafana_sysmon_url = config.grafana_sysmon_url;
  res.render('hosts', render_config);
});

/*router.get('/params', function(req, res) {
  return res.json({hosts: ['apollo', 'calliope']});
  var config = common.GetRenderConfig(req);
  config.grafana_sysmon_url = 'http://10.4.73.172:3000/d/WzsbkBwWk/system-mon?orgId=1&kiosk';
  mongo_db.get("hosts").distinct("name").then(host_list => {
    config.hosts = host_list;
    res.render('hosts', config);
  });
});


router.get('/params', function(req, res) {
  const host_list = mongo_db.get(hosts).distinct("name")
  return res.json({hosts: host_list});
});


router.get('/get_snapshot', function(req, res) {
  var q = url.parse(req.url, true).query;
  var host = q.host;
  if (typeof host == 'undefined')
    return res.json({});

  axios(common.axios_params(`SELECT last(*) FROM sysmon WHERE host='${host}';`))
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

  axios(common.axios_params(`SELECT mean(cpu_0_temp),mean(load1) FROM sysmon WHERE host='${host}' AND time > now()-${history} GROUP BY time(${binning}) fill(none);`))
  .then( blob => {
    var data = blob.data.split('\n').slice(1);
    return res.json(data.map(row => {var x = row.split(','); return [parseFloat(x[2]/1e6), parseFloat(x[3]), parseFloat(x[4])];}));
  }).catch(err => {console.log(err); return res.json([]);});
});
*/
module.exports = router;
