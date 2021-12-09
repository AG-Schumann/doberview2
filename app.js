var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var monk = require('monk');

var indexRouter = require('./routes/index');
var sensorRouter = require('./routes/sensors');
var pipelineRouter = require('./routes/pipeline');
var hostRouter = require('./routes/hosts');
var alarmRouter = require('./routes/alarms');

const hostname = process.env.DOBERVIEW_HOST;
const port = process.env.DOBERVIEW_PORT;

var app = express();

// uri has format mongodb://{user}:{pass}@{host}:{port}
var experiment = process.env.DOBERVIEW_EXPERIMENT;
var authdb = process.env.DOBERVIEW_AUTH_DB || 'admin';
var uri_base = process.env.DOBERVIEW_MONGO_URI;

// TODO figure out some way of changing experiments dynamically
var uri = `${uri_base}/${experiment}_settings`;
//console.log(`Database URI: ${uri}`);
var db = monk(uri, {authSource: authdb});
uri = `${uri_base}/${experiment}_logging`;
var log_db = monk(uri, {authSource: authdb});
uri = `${uri_base}/common`;
var common_db = monk(uri, {authSource: authdb});

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

app.use(logger('common'));
app.use(express.json());
app.use(express.urlencoded({ extended: true}));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

console.log(`New connection at ${new Date()}`);

// make all our stuff visible to the router
app.use((req, res, next) => {
  //if (!req.isAuthenticated()) return res.redirect('/login');
  req.db = db;
  req.log_db = log_db;
  req.common_db = common_db;

  return next();
});

app.use('/', sensorRouter);
app.use('/sensors', sensorRouter);
app.use('/pipeline', pipelineRouter);
app.use('/alarms', alarmRouter);
app.use('/hosts', hostRouter);

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
