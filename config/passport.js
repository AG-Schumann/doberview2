var passport = require('passport');
const https = require('https');
const config = require('./config');

passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((user, done) => done(null, user));

var GithubStrategy = require('passport-github2').Strategy;

passport.use("github", new GithubStrategy(
  {
    clientID: config.github_oauth_client_id,
    clientSecret: config.github_oauth_client_secret,
    callbackURL: config.github_callback_url,
    scope: ['user:email', 'user:name', 'user:login', 'user:id'],
  },function(accessToken, refreshToken, profile, done) {
        return done(null, profile);

  }));
