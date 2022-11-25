var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');

var deviceRouter = require('./routes/devices');
var pipelineRouter = require('./routes/pipeline');
var hostRouter = require('./routes/hosts');
var alarmRouter = require('./routes/alarms');
var grafanaRouter = require('./routes/grafana');
var logRouter = require('./routes/logs');
var hvRouter = require('./routes/hypervisor');
var shiftRouter = require('./routes/shifts');
var systemsRouter = require('./routes/systems');
var authRouter = require('./routes/auth');

const hostname = process.env.DOBERVIEW_HOST;
const port = process.env.DOBERVIEW_PORT;

var app = express();
app.disable('x-powered-by');

// uri has format mongodb://{user}:{pass}@{host}:{port}
global.experiment = process.env.DOBERVIEW_EXPERIMENT;
global.authdb = process.env.DOBERVIEW_AUTH_DB || 'admin';
global.uri_base = process.env.DOBERVIEW_MONGO_URI;

// session caching
var session = require('express-session');

app.use(session({
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
app.use(passport.initialize());
app.use(passport.session());

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

app.use(express.json());
app.use(express.urlencoded({ extended: true}));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

console.log(`New connection at ${new Date()}`);

app.use('/', deviceRouter);
app.use('/devices', deviceRouter);
app.use('/pipeline', pipelineRouter);
app.use('/alarms', alarmRouter);
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
  global.experiment = req.body.experiment;
  res.json({
    success: true
  });
});

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

app.listen(port, hostname, () => {console.log(`Server running on ${hostname}:${port}`);});

module.exports = app;
