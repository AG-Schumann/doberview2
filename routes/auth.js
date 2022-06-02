var express = require('express');
var router = express.Router();
var passport = require('passport');
var request = require('request');

router.get('/', function(req, res) {
    res.render('full_system');
});

function checkUrl (req, res, next){
    req.session.Redirect = req.header('Referer') || '/';
    next();
};

router.get('/github', checkUrl,
    passport.authenticate('github', { scope: ['user:email'] }),
    function(req, res){
        // The request will be redirected to GitHub for authentication, so this
        // function will not be called.
    });

router.get('/github/callback',  
  passport.authenticate('github', { failureRedirect: '/' }),
    function(req, res) {
        request('https://api.github.com/orgs/AG-Schumann/members', { json: true, headers: {'user-agent': 'node.js'} }, (err, res2, body) => {
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

module.exports = router;
