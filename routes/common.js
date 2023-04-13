var zmq = require('zeromq');
const config = require('../config/config')
// Doberview common functions, defined once here rather than in every file

function  SendCommand(req, to, command, delay=0) {
  var logged = new Date().getTime() + delay;
  return mongo_db.get('experiment_config').findOne({name: 'hypervisor'})
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
  var render_config = {};
  render_config.experiment = config.experiment_name;
  if (req.user) render_config.username = req.user.displayName; else render_config.username = 'Login';
  return render_config;
}

module.exports = {SendCommand, ensureAuthenticated, GetRenderConfig,};
