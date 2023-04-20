var zmq = require('zeromq');
const config = require('../config/config_pancake')
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
  if (config.use_authentication) { return next(); }
  if (req.isAuthenticated()) { return next(); }
  res.json({notify_msg: 'You must be logged in to do this', notify_status: 'error'});
}

function GetRenderConfig(req) {
  var render_config = {};
  render_config.experiment = config.experiment_name;
  if (req.user) render_config.username = req.user.displayName; else render_config.username = 'Login';
  render_config.sidebar = GetSidebar();
  return render_config;
}

function GetSidebar() {
  let content = `<img id="exp_logo" src="/images/pancake.png" alt="Pancake" width="50" style="margin-top:10px"/>`;
  content += `<ul class="list-unstyled components"><li class="colored" id="loberview">`;
  content += `<a href="/devices"><i class="fas fa-eye"></i><span>Overview</span></a>`;
  if (config.use_systems)
    content += `<a href="/systems"><i class="fas fa-object-group"></i><span>Systems</span></a>`;
  content += `<a href="/pipeline"><i class="fas fa-code-branch"></i><span>Pipeline</span></a>`;
  if (config.use_hosts)
    content += `<a href="/hosts"><i class="fas fa-server"></i> <span>Hosts</span></a>`;
  content += `<a href="/shifts"><i class="fas fa-users"></i><span>Shifters</span></a>`;
  if (config.use_grafana)
    content += `<a href="/grafana"><i class="fas fa-chart-line"></i><span>Grafana</span></a>`;
  content += `<a href="/logs"><i class="fas fa-book"></i><span>Logs</span></a>`;
  content += `<a onClick="CommandDropdown()"><i class="fas fa-terminal"></i><span>Command</span></a>`;
  if (config.use_cameras)
    content += `<a href="http://10.4.73.233:8090"><i class="fas fa-camera"></i><span>Cameras</span></a>`;
  content += '</li></ul>';
  return content
}

module.exports = {SendCommand, ensureAuthenticated, GetRenderConfig};
