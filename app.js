var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var config = require('./config/config');
const hostname = config.host;
const port = parseInt(config.port);
var monk = require('monk');

var app = express();
app.disable('x-powered-by');

// uri has format mongodb://{user}:{pass}@{host}:{port}
global.authdb = config.authdb || 'admin';
global.mongo_db = monk(`${config.mongo_uri}/${config.experiment_name}`, {authSource: authdb});
// session caching
const sessions = require('express-session');

app.use(sessions({
  secret: 'secret-key', //process.env.EXPRESS_SESSION,
  cookie: {
    maxAge: 1000 * 60 * 60 * 24 * 7 // 1 week in ms
  },
  resave: true,
  saveUninitialized: false
}));

// Passport auth
var passport = require('passport');
require('./config/passport');
app.use(passport.initialize({}));
app.use(passport.session({}));

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

app.use(express.json());
app.use(express.urlencoded({ extended: true}));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/modules', express.static(path.join(__dirname, 'node_modules')));
console.log(`New connection at ${new Date()}`);


const deviceRouter = require('./routes/devices');
app.use('/devices', deviceRouter);
if (config.use_systems) {
  const systemsRouter = require('./routes/systems');
  app.use('/systems', systemsRouter);
  app.use('/', systemsRouter); // GUI view should be default when it exists.
}
else {
  app.use('/', deviceRouter); // Else use table view as landing page.
}
let pipelineRouter = require('./routes/pipeline');
app.use('/pipeline', pipelineRouter);
if (config.use_hosts) {
  const hostRouter = require('./routes/hosts');
  app.use('/hosts', hostRouter);
}
const shiftRouter = require('./routes/shifts');
app.use('/shifts', shiftRouter);
if (config.use_grafana) {
  const grafanaRouter = require('./routes/grafana');
  app.use('/grafana', grafanaRouter);
}
const logRouter = require('./routes/logs');
app.use('/logs', logRouter);
const plotterRouter = require('./routes/plotter');
app.use('/plotter', plotterRouter);
const hvRouter = require('./routes/hypervisor');
app.use('/hypervisor', hvRouter);

if (config.use_authentication) {
  var authRouter = require('./routes/auth');
  app.use('/auth', authRouter);
}
app.get('/logout', function (req, res) {
  req.logout();
  res.redirect(req.header('Referer') || '/');
});

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(req, res) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

app.listen(port, hostname, () => {console.log(`Server running on ${hostname}:${port}`);});


module.exports = app;
