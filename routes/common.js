var net = require('net');
var url = require('url');
var axios = require('axios');
var zmq = require('zeromq');
const monk = require("monk");

// Doberview common functions, defined once here rather than in every file

function  SendCommand(req, to, command, delay=0) {
  var logged = new Date().getTime() + delay;
  return db.get('experiment_config').findOne({name: 'hypervisor'})
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
  let map = {'xebra': 'XeBra', 'pancake': 'PANCAKE'}
  config.experiment = map[experiment];
  if (req.user) config.username = req.user.displayName; else config.username = 'Login';
  return config;
}


function axios_params(req, res) {
  let mongo_db = monk(`${uri_base}/${experiment}`, {authSource: authdb});
  mongo_db.get('experiment_config').findOne({name: 'influx'}).then((doc) => {
    var get_url = new url.URL(doc['url'] + '/query');
    var params = new url.URLSearchParams({
      db: doc['db'],
      org: doc['org'],
      q: req.query
    });
    get_url.search = params.toString();
    return res.json({
      url: get_url.toString(),
      method: 'get',
      headers: {'Accept': 'application/csv', 'Authorization': `Token ${process.env.INFLUX_TOKEN}`},
    })
  });
}

module.exports = {SendCommand, ensureAuthenticated, axios_params, GetRenderConfig};
