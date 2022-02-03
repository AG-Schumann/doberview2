var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var monk = require('monk');

var indexRouter = require('./routes/index');
var deviceRouter = require('./routes/devices');
var pipelineRouter = require('./routes/pipeline');
var hostRouter = require('./routes/hosts');
var alarmRouter = require('./routes/alarms');
var grafanaRouter = require('./routes/grafana');
var logRouter = require('./routes/logs');
var hvRouter = require('./routes/hypervisor');

const hostname = process.env.DOBERVIEW_HOST;
const port = process.env.DOBERVIEW_PORT;

var app = express();
app.disable('x-powered-by');

// uri has format mongodb://{user}:{pass}@{host}:{port}
var experiment = process.env.DOBERVIEW_EXPERIMENT;
var authdb = process.env.DOBERVIEW_AUTH_DB || 'admin';
var uri_base = process.env.DOBERVIEW_MONGO_URI;

var uri = `${uri_base}/${experiment}`;
var db = monk(uri, {authSource: authdb});

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

app.use(logger('[:date[iso]] :remote-addr :method :url :status :res[content-length] - :response-time ms'));
app.use(express.json());
app.use(express.urlencoded({ extended: true}));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

console.log(`New connection at ${new Date()}`);

// make all our stuff visible to the router
app.use((req, res, next) => {
  //if (!req.isAuthenticated()) return res.redirect('/login');
  req.db = db;

  return next();
});

app.use('/', deviceRouter);
app.use('/devices', deviceRouter);
app.use('/pipeline', pipelineRouter);
app.use('/alarms', alarmRouter);
app.use('/hosts', hostRouter);
app.use('/grafana', grafanaRouter);
app.use('/logs', logRouter);
app.use('/hypervisor', hvRouter);

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
