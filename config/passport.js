var passport = require('passport');
const https = require('https');

passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((user, done) => done(null, user));

var GithubStrategy = require('passport-github2').Strategy;

passport.use("github", new GithubStrategy(
  {
    clientID: process.env.GITHUB_OAUTH_CLIENT_ID,
    clientSecret: process.env.GITHUB_OAUTH_CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/github/callback",
    scope: ['user:email', 'user:name', 'user:login', 'user:id'],
  },function(accessToken, refreshToken, profile, done) {
        return done(null, profile);

  }));
