var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var monk = require('monk');

var indexRouter = require('./routes/index');
var sensorRouter = require('./routes/sensors');
var pipelineRouter = require('./routes/pipeline');

var app = express();

// uri has format mongodb://{user}:{pass}@{host}:{port}
var experiment = process.env.DOBERVIEW_EXPERIMENT;
// TODO figure out some way of changing experiments dynamically
var uri = `${process.env.DOBERVIEW_MONGO_URI}/${experiment}_settings`;
console.log(uri);
var db = monk(uri, {authSource: 'admin'});
uri = `${process.env.DOBERVIEW_MONGO_URI}/${experiment}_logging`;
var log_db = monk(uri, {authSource: 'admin'});
uri = `${process.env.DOBERVIEW_MONGO_URI}/common`;
var common_db = monk(uri, {authSource: 'admin'});

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true}));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// make all our stuff visible to the router
app.use((req, res, next) => {
  //if (!req.isAuthenticated()) return res.redirect('/login');
  req.db = db;
  req.log_db = log_db;
  req.common_db = common_db;

  return next();
});

app.use('/', indexRouter);
app.use('/sensors', sensorRouter);
app.use('/pipeline', pipelineRouter);

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

module.exports = app;
