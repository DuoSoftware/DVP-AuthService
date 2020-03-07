

var express = require('express');
var passport = require('passport');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var errorhandler = require('errorhandler');
var session = require('express-session');
var site = require('./sites');
var oauth2 = require('./oauth2');
require('./auth');
var cors = require('cors');
var app = express();

var logger = require('dvp-common-lite/LogHandler/CommonLogHandler.js').logger;
var config = require('config');
var jwt = require('restify-jwt');
var secret = require('dvp-common-lite/Authentication/Secret.js');
var Login = require("./Login");

var mongomodels = require('dvp-mongomodels');
var healthcheck = require('dvp-healthcheck/DBHealthChecker');

var port = config.Host.port || 3000;
var host = config.Host.vdomain || 'localhost';
process.on("uncaughtException", function(err) {
  console.error(err);
  console.log("[Unhandled Exception] Node Exiting...");
  process.exit(1);
});

process.on("unhandledRejection", err => {
  console.error(err);
  console.log("[Unhandled Rejection] Node Exiting...");
  process.exit(1);
});

app.set('view engine', 'ejs');

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(session({ secret: 'keyboard cat', resave: true, saveUninitialized: true}));
app.use(passport.initialize());
app.use(passport.session());
app.use(cookieParser());
app.use(errorhandler({ dumpExceptions: true, showStack: true }));
app.use(cors());

var hc = new healthcheck(app, {mongo: mongomodels.connection});
hc.Initiate();

app.get('/', site.index);
app.get('/login', site.loginForm);
app.post('/login', site.login);
app.get('/logout', site.logout);
app.get('/account', site.account);

app.get('/oauth/authorize', oauth2.authorization);
app.get('/dialog/authorize', oauth2.authorization);
app.post('/dialog/authorize/decision', oauth2.decision);
app.post('/oauth/token', oauth2.token);
app.delete('/oauth/token/revoke/:jti', jwt({secret: secret.Secret}), oauth2.revoketoken);

app.post('/auth/login', Login.Login);
app.post('/auth/logintest', Login.LoginTest);
app.post('/auth/verify', Login.Validation);
app.post('/auth/signup', Login.SignUP);
app.post('/auth/inviteSignup', Login.SignUPInvitation);
app.post('/auth/forget', Login.ForgetPassword);
app.post('/auth/forget/token', Login.ForgetPasswordToken);
app.post('/auth/reset/:token', Login.ResetPassword);
app.get('/auth/token/:token/exists', Login.CheckToken);
app.get('/auth/activate/:token', Login.ActivateAccount);
app.post('/auth/attachments', Login.Attachments);

app.post('/auth/google', Login.Google);
app.post('/auth/github', Login.GitHub);
app.post('/auth/facebook',Login.Facebook);

app.listen(port, function () {
    logger.info("DVP-AuthService.main Server listening at %d", port);
});


