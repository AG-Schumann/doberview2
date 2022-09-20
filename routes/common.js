var net = require('net');
var url = require('url');
var axios = require('axios');
var zmq = require('zeromq');

// Doberview common functions, defined once here rather than in every file

function  SendCommand(req, to, command, delay=0) {
  var logged = new Date().getTime() + delay;
  return req.db.get('experiment_config').findOne({name: 'hypervisor'})
  .then((doc) => {
    const sock = new zmq.socket('req');
    sock.connect('tcp://' + doc.host + ':' + doc.comms.command.send);
    sock.send(JSON.stringify({
      to: to,
      from: req.user.displayName,
      command: command,
      time: logged/1000,}));
  })
  .then(() => {
    sock.recv();
  })
  .catch(err => {console.log(err.message); return {err: err.message};});
}

function ensureAuthenticated(req, res, next) {
  //var is_subnet = req.ip.startsWith(process.env.PRIVILEDGED_SUBNET);
  if (req.isAuthenticated()) { return next(); }
  res.json({notify_msg: 'You must be logged in to do this', notify_status: 'error'});
}

function GetRenderConfig(req) {
  var config = {};
  if (req.user) config.username = req.user.displayName; else config.username = 'Login';
  return config;
}


function axios_params(query, db=null) {
  var _db = db==null ? process.env.DOBERVIEW_INFLUX_DATABASE : db;
  var get_url = new url.URL(process.env.DOBERVIEW_INFLUX_URI);
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


module.exports = {SendCommand, ensureAuthenticated, axios_params, GetRenderConfig};
