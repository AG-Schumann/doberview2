var express = require('express');
var router = express.Router();
var passport = require('passport');
var request = require('request');
const config = require('../config/config')

router.get('/', function(req, res) {
    res.render('sensors');
});

function checkUrl (req, res, next){
    req.session.Redirect = req.header('Referer') || '/';
    next();
}

router.get('/github', checkUrl,
    passport.authenticate('github', { scope: ['user:email'] }),
    function(req, res){
        // The request will be redirected to GitHub for authentication, so this
        // function will not be called.
    });

router.get('/github/callback',  
  passport.authenticate('github', { failureRedirect: '/' }),
    function(req, res) {
        request('https://api.github.com/orgs/'+ config.github_org +'/members', { json: true, headers: {'user-agent': 'node.js'} }, (err, res2, body) => {
            if (err) { return console.log(err); }
            var members = body.map(({login})=> login);
            if (members.includes(req.user.username)) {
                res.redirect(req.session.Redirect || '/');
            }
            else {
                res.redirect('/logout');
            }
        });
    });

router.get('/logout', function(req, res, next) {
    req.logout(function(err) {
        if (err) { return next(err); }
        res.redirect('/');
    });
});

module.exports = router;
