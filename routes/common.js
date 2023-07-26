var zmq = require('zeromq');
const config = require('../config/config')
// Doberview common functions, defined once here rather than in every file

async function SendCommand(req, to, command, delay=0) {
  var logged = new Date().getTime() + delay;
  let doc = await req.db.get('experiment_config').findOne({name: 'hypervisor'})
  const sock = new zmq.Request();
  sock.connect('tcp://' + doc.host + ':' + doc.comms.command.send);
  await sock.send(JSON.stringify({
    to: to,
    from: req.user.displayName,
    command: command,
    time: logged/1000,}));
  const [result] = await sock.receive();
  console.log(result);
}


function ensureAuthenticated(req, res, next) {
  //var is_subnet = req.ip.startsWith(process.env.PRIVILEDGED_SUBNET);
  if (!config.use_authentication) { return next(); }
  if (req.isAuthenticated()) { return next(); }
  res.json({notify_msg: 'You must be logged in to do this', notify_status: 'error'});
}

function GetRenderConfig(req) {
  var render_config = {};
  render_config.experiment = config.experiment_name;
  if (req.user) render_config.username = req.user.displayName; else render_config.username = 'Login';
  render_config.hide_login = !config.use_authentication;
  if (config.use_authentication)
    render_config.github_org = config.github_org;
  render_config.hide_systems = !config.use_systems;
  render_config.hide_hosts = !config.use_hosts;
  render_config.hide_grafana = !config.use_grafana;
  render_config.hide_cameras = !config.use_cameras;
  render_config.camera_link = config.camera_link;
  return render_config;
}

module.exports = {SendCommand, ensureAuthenticated, GetRenderConfig};
