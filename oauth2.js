/**
 * Created by a on 6/6/2016.
 */

var oauth2orize = require("oauth2orize");
var passport = require("passport");
var login = require("connect-ensure-login");
var Client = require("dvp-mongomodels/model/Client");
var User = require("dvp-mongomodels/model/User");
var RefreshToken = require("dvp-mongomodels/model/RefreshToken");
var AuthorizationCode = require("dvp-mongomodels/model/AuthorizationCodes");
var accessToken = require("dvp-mongomodels/model/AccessToken");
var FlakeIdGen = require("flake-idgen");
var intformat = require("biguint-format");
var uuid = require("node-uuid");
var jwtBearer = require("oauth2orize-jwt-bearer").Exchange;
var jwt = require("jsonwebtoken");
var util = require("util");
var moment = require("moment");
var redis = require("ioredis");
var config = require("config");
var messageFormatter = require("dvp-common-lite/CommonMessageGenerator/ClientMessageJsonFormatter.js");
const { logger } = require("dvp-common-lite/LogHandler/CommonLogHandler");

var redisip = config.Redis.ip;
var redisport = config.Redis.port;
var redispass = config.Redis.password;
var redismode = config.Redis.mode;
var redisdb = config.Redis.db;

var redisSetting = {
  port: redisport,
  host: redisip,
  family: 4,
  password: redispass,
  db: redisdb,
  retryStrategy: function (times) {
    var delay = Math.min(times * 50, 2000);
    return delay;
  },
  reconnectOnError: function (err) {
    return true;
  },
};

if (redismode == "sentinel") {
  if (
    config.Redis.sentinels &&
    config.Redis.sentinels.hosts &&
    config.Redis.sentinels.port &&
    config.Redis.sentinels.name
  ) {
    var sentinelHosts = config.Redis.sentinels.hosts.split(",");
    if (Array.isArray(sentinelHosts) && sentinelHosts.length > 2) {
      var sentinelConnections = [];

      sentinelHosts.forEach(function (item) {
        sentinelConnections.push({
          host: item,
          port: config.Redis.sentinels.port,
        });
      });

      redisSetting = {
        sentinels: sentinelConnections,
        name: config.Redis.sentinels.name,
        password: redispass,
      };
    } else {
      console.log("No enough sentinel servers found .........");
    }
  }
}

var redisClient = undefined;

if (redismode != "cluster") {
  redisClient = new redis(redisSetting);
} else {
  var redisHosts = redisip.split(",");
  if (Array.isArray(redisHosts)) {
    redisSetting = [];
    redisHosts.forEach(function (item) {
      redisSetting.push({
        host: item,
        port: redisport,
        family: 4,
        password: redispass,
      });
    });

    var redisClient = new redis.Cluster([redisSetting]);
  } else {
    redisClient = new redis(redisSetting);
  }
}

redisClient.on("error", function (err) {
  console.log("Error ".red, err);
});

var generator = new FlakeIdGen();

var server = oauth2orize.createServer();

server.serializeClient(function (client, done) {
  return done(null, client.id);
});

server.deserializeClient(function (id, done) {
  Client.findById(id, function (err, client) {
    if (err) {
      return done(err);
    }
    return done(null, client);
  });
});

server.grant(
  oauth2orize.grant.code(function (
    client,
    redirectURI,
    user,
    ares,
    reqObj,
    done
  ) {
    var id1 = generator.next();
    var id3 = intformat(id1, "dec");
    var code = id3;

    var scopeArray = reqObj.scope;

    var authorizationcode = AuthorizationCode({
      code: code,
      userId: user.id,
      clientId: client.id,
      scope: scopeArray,
      redirectURL: redirectURI,
    });

    authorizationcode.save(function (err, authcode) {
      if (err) {
        return done(err);
      }
      done(null, code);
    });
  })
);

server.grant(
  oauth2orize.grant.token(function (client, user, ares, reqObj, done) {
    ///var token = uuid.v1();

    ////////////////////////////////////////////////////////////////////////////////////

    var jti = uuid.v4();
    var secret = uuid.v4();
    var expin = moment().add(7, "days").unix();
    var redisKey = "token:iss:" + user.username + ":" + jti;
    redisClient.set(redisKey, secret, redis.print);
    redisClient.expireat(redisKey, expin);

    var payload = {};
    payload.iss = user.username;
    payload.jti = jti;
    payload.sub = "Access client";
    payload.exp = expin;
    payload.tenant = user.tenant;
    payload.company = user.company;
    payload.aud = client.name;

    //payload.scope = client.claims;

    var scopes = GetScopes(user, reqObj.scope);
    payload.context = scopes.context;
    payload.scope = scopes.scope;

    var token = jwt.sign(payload, secret);

    ////////////////////////////////////////////////////////////////////////////////////////////

    var accesstoken = accessToken({
      jti: jti,
      type: "token",
      userId: user.id,
      clientId: client.id,
      scope: reqObj.scope,
      expirationDate: expin,
    });

    accesstoken.save(function (err, accesstoken) {
      if (err) {
        return done(err);
      }
      return done(null, token, null, { expires_in: expin });
    });
  })
);

server.exchange(
  oauth2orize.exchange.code(function (client, code, redirectURI, done) {
    AuthorizationCode.findOne({ code: code }, function (err, authCode) {
      if (err) {
        return done(err);
      }
      if (!authCode) {
        return done(null, false);
      }
      if (client.id !== authCode.clientId) {
        return done(null, false);
      }
      if (redirectURI !== authCode.redirectURL) {
        return done(null, false);
      }

      AuthorizationCode.findOneAndRemove({ code: code }, function (err) {
        if (err) {
          return done(err);
        }
        //var token = uuid.v1();

        User.findById(authCode.userId, function (err, user) {
          if (err) {
            return done(err);
          }
          if (!user) {
            return done(null, false);
          }

          ////////////////////////////////////////////////////////////////////////////////////

          var jti = uuid.v4();
          var secret = uuid.v4();
          var expin = moment().add(7, "days").unix();
          var redisKey = "token:iss:" + user.username + ":" + jti;
          redisClient.set(redisKey, secret, redis.print);
          redisClient.expireat(redisKey, expin);

          var payload = {};
          payload.iss = user.username;
          payload.jti = jti;
          payload.sub = "Access client";
          payload.exp = expin;
          payload.tenant = user.tenant;
          payload.company = user.company;
          payload.aud = client.name;

          var scopes = GetScopes(user, authCode.scope);
          payload.context = scopes.context;
          payload.scope = scopes.scope;

          var token = jwt.sign(payload, secret);

          ////////////////////////////////////////////////////////////////////////////////////////////

          var accesstoken = accessToken({
            jti: jti,
            type: "code",
            userId: authCode.userId,
            clientId: authCode.clientId,
            scope: authCode.scope,
            expirationDate: Date.now(),
          });

          accesstoken.save(function (err, accesstoken) {
            if (err) {
              return done(err);
            }

            //////////////////////////////////////////////////////////
            var rToken = null;

            if (
              authCode.scope &&
              authCode.scope.indexOf("offline_access") == 0
            ) {
              rToken = uuid.v1();

              var refreshToken = RefreshToken({
                token: rToken,
                userId: authCode.userId,
                clientId: authCode.clientId,
                scope: authCode.scope,
                expirationDate: Date.now(),
              });

              refreshToken.save(function (err, refToken) {
                if (err) {
                  return done(err);
                }
                return done(null, token, rToken, { expires_in: expin });
              });
            } else {
              return done(null, token, rToken, { expires_in: expin });
            }
            /////////////////////////////////////////////////////////////////////////////////
          });
        });
      });
    });
  })
);

server.exchange(
  "urn:ietf:params:oauth:grant-type:jwt-bearer",
  jwtBearer(function (client, data, signature, done) {
    var crypto = require("crypto");
    var pub = "secret";
    var verifier = crypto.createVerify("RSA-SHA256");

    var token = util.format("%s.%s", data, signature);

    var decoded = jwt.decode(token);

    Client.findOne(
      { clientId: decoded.prn, redirectURL: decoded.url },
      function (err, client) {
        if (err) {
          return done(err);
        } else if (!client) {
          return done(null, null);
        } else {
          jwt.verify(token, client.clientSecret, function (err, decoded) {
            if (err) {
              done(null, null);
            } else {
              User.findOne({ username: decoded.iss }, "+password", function (
                err,
                user
              ) {
                var accessToken = null;
                if (!err) {
                  var jti = uuid.v4();
                  var secret = uuid.v4();
                  var expin = moment().add(7, "days").unix();
                  var redisKey = "token:iss:" + user.username + ":" + jti;
                  redisClient.set(redisKey, secret, redis.print);
                  redisClient.expireat(redisKey, expin);

                  var payload = {};
                  payload.iss = user.username;
                  payload.jti = jti;
                  payload.sub = decoded.sub;
                  payload.exp = moment().add(7, "days").unix();
                  payload.tenant = user.tenant;
                  payload.company = user.company;
                  payload.aud = decoded.prn;

                  var scopes = GetScopes(user, decoded.scope);
                  payload.context = scopes.context;
                  payload.scope = scopes.scope;

                  var accessToken = jwt.sign(payload, secret);
                }

                done(null, accessToken);
              });
            }
          });
        }
      }
    );
  })
);

server.exchange(
  oauth2orize.exchange.password(function (
    client,
    username,
    password,
    scope,
    done
  ) {
    //Validate the user

    User.findOne({ username: username }, "+password", function (err, user) {
      if (err) {
        return done(err);
      }
      if (!user) {
        return done(null, false);
      }

      if (!password) {
        return done(null, false);
      }
      /*
        if (password !== user.password) {
            return done(null, false);
        }
 */

      user.comparePassword(password, function (err, isMatch) {
        if (!isMatch) {
          return done(null, false);
        } else {
          var scopeArray = scope;
          ////////////////////////////////////////////////////////////////////////////////////

          var jti = uuid.v4();
          var secret = uuid.v4();
          var expin = moment().add(7, "days").unix();
          var redisKey = "token:iss:" + user.username + ":" + jti;
          redisClient.set(redisKey, secret, redis.print);
          redisClient.expireat(redisKey, expin);

          var payload = {};
          payload.iss = user.username;
          payload.jti = jti;
          payload.sub = "Access client";
          payload.exp = expin;
          payload.tenant = user.tenant;
          payload.company = user.company;
          payload.aud = client.name;

          //payload.scope = scope;

          var scopes = GetScopes(user, scopeArray);
          payload.context = scopes.context;
          payload.scope = scopes.scope;

          var token = jwt.sign(payload, secret);

          var accesstoken = accessToken({
            userId: user.id,
            type: "password",
            clientId: client.id,
            jti: jti,
            scope: scopeArray,
            expirationDate: Date.now(),
          });

          accesstoken.save(function (err, accesstoken) {
            if (err) {
              return done(err);
            }

            var rToken = null;

            if (scope && scope.indexOf("offline_access") == 0) {
              rToken = uuid.v1();

              var refreshToken = RefreshToken({
                token: rToken,
                userId: user.id,
                clientId: client.id,
                scope: scopeArray,
                expirationDate: Date.now(),
              });

              refreshToken.save(function (err, refToken) {
                if (err) {
                  return done(err);
                }
                return done(null, token, rToken, { expires_in: expin });
              });
            } else {
              return done(null, token, rToken, { expires_in: expin });
            }
          });
        }
      });
    });
  })
);

server.exchange(
  oauth2orize.exchange.clientCredentials(function (client, scope, done) {
    var token = uuid.v1();

    var accesstoken = accessToken({
      userId: -1,
      clientId: client.id,
      type: "client-credentials",
      scope: scope,
      expirationDate: Date.now(),
    });

    accesstoken.save(function (err, accesstoken) {
      if (err) {
        return done(err);
      }
      return done(null, token);
    });
  })
);

server.exchange(
  oauth2orize.exchange.refreshToken(function (
    client,
    refreshToken,
    scope,
    done
  ) {
    RefreshToken.findOne({ token: refreshToken }, function (err, refToken) {
      if (err) {
        return done(err);
      }
      if (!refToken) {
        return done(null, false);
      }
      if (client.id !== refToken.clientId) {
        return done(null, false);
      }

      var scopeArray = refToken.scope;
      User.findById(refToken.userId, function (err, user) {
        if (err) {
          return done(err);
        }
        if (!user) {
          return done(null, false);
        }

        //var token = uuid.v1();

        ////////////////////////////////////////////////////////////////////////////////////

        var jti = uuid.v4();
        var secret = uuid.v4();
        var expin = moment().add(7, "days").unix();
        var redisKey = "token:iss:" + user.username + ":" + jti;
        redisClient.set(redisKey, secret, redis.print);
        redisClient.expireat(redisKey, expin);

        var payload = {};
        payload.iss = user.username;
        payload.jti = jti;
        payload.sub = "Access client";
        payload.exp = expin;
        payload.tenant = user.tenant;
        payload.company = user.company;
        payload.aud = client.name;

        //payload.scope = scope;

        var scopes = GetScopes(user, scopeArray);
        payload.context = scopes.context;
        payload.scope = scopes.scope;

        var token = jwt.sign(payload, secret);

        ////////////////////////////////////////////////////////////////////////////////////////////

        var accesstoken = accessToken({
          userId: refToken.userId,
          type: "refresh-token",
          clientId: client.id,
          jti: jti,
          scope: scopeArray,
          expirationDate: Date.now(),
        });

        accesstoken.save(function (err, accesstoken) {
          if (err) {
            return done(err);
          }
          return done(null, token, null, { expires_in: expin });
        });
      });
    });
  })
);

exports.authorization = [
  login.ensureLoggedIn(),
  server.authorization(function (clientID, redirectURI, scope, done) {
    Client.findOne({ clientId: clientID, redirectURL: redirectURI }, function (
      err,
      client
    ) {
      if (err) {
        return done(err);
      } else if (!client) {
        var noClientErr = new Error("No client found");
        return done(noClientErr);
      }

      if (client) {
        client.scope = scope;
      }

      return done(null, client, redirectURI);
    });
  }),
  function (req, res) {
    res.render("dialog", {
      transactionID: req.oauth2.transactionID,
      user: req.user,
      client: req.oauth2.client,
    });
  },
];

exports.decision = [login.ensureLoggedIn(), server.decision()];

exports.token = [
  passport.authenticate(["basic", "oauth2-client-password"], {
    session: false,
  }),
  server.token(),
  server.errorHandler(),
];

exports.listActiveLogins = function (req, res, next) {
  let tenant = req.query.tenant;
  let orgId = req.query.orgId;
  let console = req.query.console;
  var loginKey = `tenant:${tenant}:company:${orgId}:${console}:logins`;

  let jsonString = messageFormatter.FormatMessage(undefined, "List Active Logins failed", false, undefined);
  redisClient.hgetall(loginKey, (err, items) => {
    if (!err) {
      // items.forEach((jti) => {
      //   var redisKey = "token:iss:" + iss + ":" + jti;
      //   redis_op.del(redisKey, redis.print);
      // });
      jsonString = messageFormatter.FormatMessage(undefined, JSON.stringify(items), true, undefined);
      if (res) {
        res.end(jsonString);
      }
    } else {
      logger.error(`Get list of keys error ${err.message}`);

      if (res) {
        jsonString = messageFormatter.FormatMessage(
            err,
            "List Active Logins failed",
            false,
            undefined
        );
        return res.status(401).send(jsonString);
      }
    }
  });
}

exports.forcedLogoffById = function (req, res, next) {

  let userId = req.params.userid;
  let username = req.query.username;
  let console = req.query.console;
  let tenant = req.query.tenant;
  let orgId = req.query.orgId;
  let jsonString = messageFormatter.FormatMessage(undefined, "Forced logoff failed", false, undefined);

  var loginKey = `tenant:${tenant}:company:${orgId}:${console}:logins`;
  var userTokenListKey = loginKey + ":" + userId;
  const iss = username;
  redisClient.lrange(userTokenListKey, 0, -1, (err, items) => {
    if (!err) {
      var redis_op = redisClient.multi();
      items.forEach((jti) => {
        var redisKey = "token:iss:" + iss + ":" + jti;
        redis_op.del(redisKey, redis.print);
      });
      redis_op.hdel(loginKey, userId);
      redis_op.del(userTokenListKey);
      redis_op.exec((err, result) => {
        if (err) {
          logger.error(
              `Delete multiple items on Forced logoff failed ${err.message}`
          );
          jsonString = messageFormatter.FormatMessage(
              err,
              "Forced logoff failed",
              false,
              undefined
          );
          return res.status(401).send(jsonString);
        } else {
          items.forEach(async (jti) => {
            await accessToken.findOneAndUpdate({jti: jti}, {logged_out_at: Date.now()});
          });
          jsonString = messageFormatter.FormatMessage(undefined, "Forced logoff successful", true, undefined);
        }

        if (res) {
          res.end(jsonString);
        }
      });
    } else {
      logger.error(`Get list of keys error ${err.message}`);

      if (res) {
        jsonString = messageFormatter.FormatMessage(
            err,
            "Forced logoff failed",
            false,
            undefined
        );
        return res.status(401).send(jsonString);
      }
    }
  });
}

exports.forcedLogoff = function (req, res, next) {

    let username = req.params.userid;
    let console = req.query.console;
    let tenant = req.query.tenant;
    let orgId = req.query.orgId;

    User.findOne({username: username}, function (
        err,
        user
    ) {
        if (!user) {
            return res.status(401).send({message: "Invalid email"});
        }
        let jsonString = messageFormatter.FormatMessage(undefined, "Forced logoff failed", false, undefined);

        const userId = user.id;
        var loginKey = `tenant:${tenant}:company:${orgId}:${console}:logins`;
        var userTokenListKey = loginKey + ":" + userId;
        const iss = username;
        redisClient.lrange(userTokenListKey, 0, -1, (err, items) => {
            if (!err) {
                var redis_op = redisClient.multi();
                items.forEach((jti) => {
                    var redisKey = "token:iss:" + iss + ":" + jti;
                    redis_op.del(redisKey, redis.print);
                });
                redis_op.hdel(loginKey, userId);
                redis_op.del(userTokenListKey);
                redis_op.exec((err, result) => {
                    if (err) {
                        logger.error(
                            `Delete multiple items on Forced logoff failed ${err.message}`
                        );
                        jsonString = messageFormatter.FormatMessage(
                            err,
                            "Forced logoff failed",
                            false,
                            undefined
                        );
                        return res.status(401).send(jsonString);
                    } else {
                        items.forEach(async (jti) => {
                            await accessToken.findOneAndUpdate({jti: jti}, {logged_out_at: Date.now()});
                        });
                        jsonString = messageFormatter.FormatMessage(undefined, "Forced logoff successful", true, undefined);
                    }

                    if (res) {
                        res.end(jsonString);
                    }
                });
            } else {
                logger.error(`Get list of keys error ${err.message}`);

                if (res) {
                    jsonString = messageFormatter.FormatMessage(
                        err,
                        "Forced logoff failed",
                        false,
                        undefined
                    );
                    return res.status(401).send(jsonString);
                }
            }
        });
    });
};

exports.revoketoken = function (req, res, next) {
  var id = req.params.jti;
  var jsonString = {};
  var iss = req.user.iss;

  jsonString = messageFormatter.FormatMessage(
    undefined,
    "Revoke token failed",
    false,
    undefined
  );
  if (iss) {
    accessToken.findOneAndUpdate(
      { jti: id },
      { logged_out_at: Date.now() },
      function (err, token) {
        if (err) {
          jsonString = messageFormatter.FormatMessage(
            err,
            "Revoke token failed",
            false,
            undefined
          );
        } else {
          var loginKey = `tenant:${config.Tenant.activeTenant}:company:${token.orgId}:${token.console}:logins`;
          var userTokenListKey = loginKey + ":" + token.userId;
          var redisKey = "token:iss:" + iss + ":" + id;
          var claimsKey = "claims:iss:" + iss + ":" + id;

          redisClient
            .multi()
            .del(redisKey, redis.print)
            .del(claimsKey, redis.print)
            .lrem(userTokenListKey, 0, id)
            .exec(function (err, result) {
              if (!err) {
                jsonString = messageFormatter.FormatMessage(
                  undefined,
                  "Revoke token successful",
                  true,
                  undefined
                );
              }

              //if (config.auth.check_concurrent_limit) {
              redisClient.llen(userTokenListKey).then(function (value) {
                if (value == 0) {
                  redisClient.hdel(loginKey, token.userId, (err, val) => {
                    if (err) {
                      logger.error(`Clear hash is failed ${err}`);
                    }
                    if (res) {
                      res.end(jsonString);
                    }
                  });
                } else {
                  if (res) {
                    res.end(jsonString);
                  }
                }
              });
              //   } else {
              //     if (res) {
              //       res.end(jsonString);
              //     }
              //   }
            });
        }
      }
    );
  } else {
    res.end(jsonString);
  }
};

function GetScopes(user, claims) {
  var context = {};
  var payload = {};
  payload.context = {};
  payload.scope = [];

  if (claims) {
    var index = claims.indexOf("profile_contacts");

    if (index > -1) {
      payload.context.phonenumber = user.phoneNumber;
      payload.context.email = user.email;
      payload.context.othercontacts = user.contacts;

      claims.splice(index, 1);
    }

    var index = claims.indexOf("app_meta");

    if (index > -1) {
      payload.context.appmeta = user.app_meta;
      claims.splice(index, 1);
    }

    var index = claims.indexOf("user_scopes");

    if (index > -1) {
      payload.context.userscopes = user.user_scopes;
      claims.splice(index, 1);
    }

    var index = claims.indexOf("client_scopes");

    if (index > -1) {
      payload.context.clientscopes = user.client_scopes;
      claims.splice(index, 1);
    }

    var index = claims.indexOf("resourceid");

    if (index > -1) {
      payload.context.resourceid = user.resourceid;
      claims.splice(index, 1);
    }

    var profileClaimsFound = claims.filter(function (item, index) {
      return item.startsWith("profile_");
    });

    profileClaimsFound.forEach(function (value) {
      var arr = value.split("_");
      if (arr.length > 1) {
        var action = arr[0];
        var resource = arr[1];

        if (action == "profile") {
          if (resource == "password") {
            payload.context[resource] = undefined;
          } else {
            payload.context[resource] = user[resource];
          }
        }
      }
    });

    /////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    var index = claims.indexOf("all_all");

    if (index > -1) {
      user.user_scopes.forEach(function (item) {
        var actionObj = {};
        actionObj.resource = item.scope;
        actionObj.actions = [];

        if (item.read) {
          actionObj.actions.push("read");
        }

        if (item.write) {
          actionObj.actions.push("write");
        }

        if (item.delete) {
          actionObj.actions.push("delete");
        }

        payload.scope.push(actionObj);
      });
    } else {
      claims.forEach(function (value) {
        var arr = value.split("_");
        if (arr.length > 1) {
          var action = arr[0];
          var resource = arr[1];

          var scopeFound = user.user_scopes.filter(function (item) {
            return item.scope == resource;
          });

          if (scopeFound.length > 0) {
            var myscope = {};
            myscope.resource = scopeFound[0].scope;
            myscope.actions = [];

            if (action == "read") {
              var actionArray = [];
              if (scopeFound[0].read) {
                actionArray.push("read");
              }

              myscope.actions = myscope.actions.concat(actionArray);
            } else if (action == "write") {
              var actionArray = [];
              if (scopeFound[0].read) {
                actionArray.push("read");
              }

              if (scopeFound[0].write) {
                actionArray.push("write");
              }

              myscope.actions = myscope.actions.concat(actionArray);
            } else if (action == "all") {
              var actionArray = [];
              if (scopeFound[0].read) {
                actionArray.push("read");
              }

              if (scopeFound[0].write) {
                actionArray.push("write");
              }

              if (scopeFound[0].delete) {
                actionArray.push("delete");
              }

              myscope.actions = myscope.actions.concat(actionArray);
            }

            payload.scope.push(myscope);
          }
        }
      });
    }
  }

  return payload;
}
