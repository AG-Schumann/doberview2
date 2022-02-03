var net = require('net');


// Doberview common functions, defined once here rather than in every file

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

module.exports = {SendCommand, ensureAuthenticated};
