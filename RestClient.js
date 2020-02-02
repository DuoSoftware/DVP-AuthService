/**
 * Created by Heshan.i on 6/17/2016.
 */

var request = require('request');
var util = require('util');
var config = require('config');
var DoPost = function (companyInfo, serviceurl, postData, callback) {
    var jsonStr = JSON.stringify(postData);
    var accessToken = util.format("bearer %s", config.Services.accessToken);
    var options = {
        url: serviceurl,
        method: 'POST',
        headers: {
            'content-type': 'application/json',
            'authorization': accessToken,
            'companyinfo': companyInfo
        },
        body: jsonStr
    };
    try {
        request.post(options, function optionalCallback(err, httpResponse, body) {
            if (err) {
                console.log('upload failed:', err);
            }
            console.log('Server returned: %j', body);
            callback(err, httpResponse, body);
        });
    }catch(ex){
        callback(ex, undefined, undefined);
    }
};

var DoGet = function (companyInfo, serviceurl, postData, callback) {
    var jsonStr = JSON.stringify(postData);
    //var httpUrl = util.format('%s? %s', serviceurl, jsonStr);
    var accessToken = util.format("bearer %s", config.Services.accessToken);
    console.log('RouteRequest:: %s', serviceurl);
    var options = {
        url: serviceurl,
        headers: {
            'content-type': 'application/json',
            'authorization': accessToken,
            'companyinfo': companyInfo
        }
    };
    request(options, function optionalCallback(err, httpResponse, body) {
        if (err) {
            console.log('upload failed:', err);
        }
        console.log('Server returned: %j', body);
        callback(err, httpResponse, body);
    });
};


module.exports.DoPost = DoPost;
module.exports.DoGet = DoGet;