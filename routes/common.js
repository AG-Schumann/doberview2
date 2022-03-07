var net = require('net');
var url = require('url');
var axios = require('axios');


// Doberview common functions, defined once here rather than in every file
const influx_url = process.env.DOBERVIEW_INFLUX_URI;

function SendCommand(req, to, command, delay=0) {
  var logged = new Date().getTime() + delay;
  return req.db.get('experiment_config').findOne({name: 'hypervisor'})
  .then((doc) => {
    var hn = doc.global_dispatch.hypervisor[0];
    var p = doc.global_dispatch.hypervisor[1];
    const client = net.createConnection(p, hn, () => {
      client.write(JSON.stringify({
        to: to,
        from: 'web',
        command: command,
        time: logged/1000,
      }), () => client.destroy());
    });
    return {};
  })
  .catch(err => {console.log(err.message); return {err: err.message};});
}

function ensureAuthenticated(req, res, next) {
  return req.isAuthenticated() ? next() : res.redirect('/login');
}

function axios_params(query, db=null) {
  var _db = db==null ? process.env.DOBERVIEW_INFLUX_DATABASE : db;
  var get_url = new url.URL(influx_url);
  var params = new url.URLSearchParams({
    db: _db,
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


module.exports = {SendCommand, ensureAuthenticated, axios_params};
