/**
 * Created by Heshan.i on 6/27/2017.
 */

var activeDirectory = require('dvp-mongomodels/model/ActiveDirectory').ActiveDirectory;
var CryptoJS = require("crypto-js");
var util = require('util');
var Q = require('q');
var ActiveDirectory = require('activedirectory');


//--------------------------ActiveDirectoryFunctions-----------------------------------

var getActiveDirectoryInternal = function (tenant, company) {

    var deferred = Q.defer();

    try {
        activeDirectory.findOne({company: company, tenant: tenant}, '+password', function(err, adResult) {
            if (err) {

                deferred.reject(err);

            }else{

                if(adResult) {

                    if(adResult.password) {

                        var bytes = CryptoJS.AES.decrypt(adResult.password, util.format('%d %d edj44thgjfdje', tenant, company));
                        adResult.password = bytes.toString(CryptoJS.enc.Utf8);

                    }
                    deferred.resolve(adResult);

                }else{

                    deferred.resolve();

                }

            }
        });
    }catch(ex){

        deferred.reject(ex);

    }

    return deferred.promise;
};

var authenticateUser = function (tenant, company, username, password, callback) {

    try {

        getActiveDirectoryInternal(tenant, company).then(function(result){

            if(result) {

                var adConfig = {
                    url: util.format('ldap://%s', result.ldapServerIp),
                    baseDN: result.baseDN,
                    username: result.username,
                    password: result.password
                };

                var ad = new ActiveDirectory(adConfig);

                ad.authenticate(username, password, function(err, auth) {
                    if (err) {
                        callback(err, undefined)
                    }

                    if (auth) {
                        callback(undefined, auth);
                    }
                    else {
                        callback(new Error("Failed to authenticate"), undefined);
                    }
                });

            }else{

                callback(new Error("No Active Directory Configuration Found"), undefined);

            }

        }).catch(function(err){

            callback(err, undefined);

        });


    }catch(ex){

        callback(ex, undefined);

    }
};

module.exports.AuthenticateUser = authenticateUser;