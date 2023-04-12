var passport = require('passport');
<<<<<<< HEAD
const https = require('https');
const config = require('./config');
=======
>>>>>>> 2511de0a69fbcc5cda9875d0b7ebdc55f51fac1f

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
