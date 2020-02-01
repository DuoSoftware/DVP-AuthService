

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

var port = config.Host.port || 3000;
var host = config.Host.vdomain || 'localhost';

app.set('view engine', 'ejs');

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(session({ secret: 'keyboard cat', resave: true, saveUninitialized: true}));
app.use(passport.initialize());
app.use(passport.session());
app.use(cookieParser());
app.use(errorhandler({ dumpExceptions: true, showStack: true }));
app.use(cors());

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


























/*


 var server = restify.createServer({
 name: "DVP User Service"
 });

 server.pre(restify.pre.userAgentConnection());
 server.use(restify.bodyParser({ mapParams: false }));
 restify.CORS.ALLOW_HEADERS.push('authorization');
 server.use(restify.CORS());
 server.use(restify.fullResponse());
 server.use(jwt({secret: secret.Secret}));


 //////////////////////////////Cloud API/////////////////////////////////////////////////////

 server.get('/DVP/API/:version/Users', authorization({resource:"user", action:"read"}), userService.GetUsers);
 server.get('/DVP/API/:version/User/:name', authorization({resource:"user", action:"read"}), userService.GetUser);
 server.del('/DVP/API/:version/User/:name', authorization({resource:"user", action:"delete"}), userService.DeleteUser);
 server.post('/DVP/API/:version/User', authorization({resource:"user", action:"write"}), userService.CreateUser);
 server.put('/DVP/API/:version/User/:name', authorization({resource:"user", action:"write"}), userService.UpdateUser);

 //////////////////////////////Organisation API/////////////////////////////////////////////////////
 server.get('/DVP/API/:version/User/:name/profile', authorization({resource:"userProfile", action:"read"}), userService.GetUserProfile);
 server.put('/DVP/API/:version/User/:name/profile', authorization({resource:"userProfile", action:"write"}), userService.UpdateUserProfile);

 server.get('/DVP/API/:version/Organisations', authorization({resource:"user", action:"read"}), organisationService.GetOrganisations);
 server.get('/DVP/API/:version/Organisation', authorization({resource:"user", action:"read"}), organisationService.GetOrganisation);
 server.del('/DVP/API/:version/Organisation', authorization({resource:"user", action:"delete"}), organisationService.DeleteOrganisation);
 server.post('/DVP/API/:version/Organisation', authorization({resource:"user", action:"write"}), organisationService.CreateOrganisation);
 server.patch('/DVP/API/:version/Organisation', authorization({resource:"user", action:"write"}), organisationService.UpdateOrganisation);

 server.get('/DVP/API/:version/Users/:name/Scope', authorization({resource:"userScope", action:"write"}), userService.GetUserScopes);
 server.put('/DVP/API/:version/Users/:name/Scope', authorization({resource:"userScope", action:"write"}), userService.AddUserScopes);
 server.del('/DVP/API/:version/User/:name/Scope/:scope', authorization({resource:"userScope", action:"delete"}), userService.DeleteUser);

 server.get('/DVP/API/:version/Users/:name/Scope', authorization({resource:"userAppScope", action:"write"}), userService.GetAppScopes);
 server.put('/DVP/API/:version/Users/:name/AppScope', authorization({resource:"userAppScope", action:"write"}), userService.AddUserAppScopes);
 server.del('/DVP/API/:version/User/:name/AppScope/:scope', authorization({resource:"userAppScope", action:"delete"}), userService.RemoveUserAppScopes);


 server.get('/DVP/API/:version/Users/:name/UserMeta', authorization({resource:"userMeta", action:"read"}), userService.GetUserMeta);
 server.put('/DVP/API/:version/Users/:name/UserMeta', authorization({resource:"userMeta", action:"write"}), userService.UpdateUserMetadata);

 server.get('/DVP/API/:version/Users/:name/AppMeta', authorization({resource:"userAppMeta", action:"read"}), userService.GetAppMeta);
 server.put('/DVP/API/:version/Users/:name/AppMeta', authorization({resource:"userAppMeta", action:"write"}), userService.UpdateAppMetadata);




 server.listen(port, function () {

 logger.info("DVP-UserService.main Server %s listening at %s", server.name, server.url);

 });

 */
