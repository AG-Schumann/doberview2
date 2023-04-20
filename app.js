var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');

var deviceRouter = require('./routes/devices');
var pipelineRouter = require('./routes/pipeline');
var hostRouter = require('./routes/hosts');
var grafanaRouter = require('./routes/grafana');
var logRouter = require('./routes/logs');
var hvRouter = require('./routes/hypervisor');
var shiftRouter = require('./routes/shifts');
var systemsRouter = require('./routes/systems');
var authRouter = require('./routes/auth');
var config = require('./config/config');
const hostname = config.host;
const port = config.port;
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

app.use('/', deviceRouter);
app.use('/devices', deviceRouter);
app.use('/pipeline', pipelineRouter);
app.use('/hosts', hostRouter);
app.use('/grafana', grafanaRouter);
app.use('/logs', logRouter);
app.use('/hypervisor', hvRouter);
app.use('/shifts', shiftRouter);
app.use('/systems', systemsRouter);
app.use('/auth', authRouter);
app.get('/logout', function(req, res){
  req.logout();
  res.redirect(req.header('Referer') || '/');
});
app.post('/experiment', function(req, res){
  console.log("changing experiment to " + req.body.name);
  let session = req.session;
  session.experiment = req.body.name;
  res.json({
    success: true
  });
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
