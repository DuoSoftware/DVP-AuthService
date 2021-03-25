/**
 * Created by Heshan.i on 6/6/2016.
 */
var redis = require('ioredis');
var config = require('config');
var logger = require('dvp-common-lite/LogHandler/CommonLogHandler.js').logger;
var Org = require('dvp-mongomodels/model/Organisation');
var VPackage = require('dvp-mongomodels/model/Package');
var Console = require('dvp-mongomodels/model/Console');
var EventEmitter = require('events').EventEmitter;
var messageFormatter = require('dvp-common-lite/CommonMessageGenerator/ClientMessageJsonFormatter.js');
var util = require('util');
var validator = require('validator');
var Tenant = require('dvp-mongomodels/model/Tenant').Tenant;
var UserAccount = require('dvp-mongomodels/model/UserAccount');

var restClientHandler = require('./RestClient.js');

var redisip = config.Redis.ip;
var redisport = config.Redis.port;
var redispass = config.Redis.password;
var redismode = config.Redis.mode;
var redisdb = config.Redis.db;



var redisSetting =  {
    port:redisport,
    host:redisip,
    family: 4,
    password: redispass,
    db: redisdb,
    retryStrategy: function (times) {
        var delay = Math.min(times * 50, 2000);
        return delay;
    },
    reconnectOnError: function (err) {

        return true;
    }
};

if(redismode == 'sentinel'){

    if(config.Redis.sentinels && config.Redis.sentinels.hosts && config.Redis.sentinels.port && config.Redis.sentinels.name){
        var sentinelHosts = config.Redis.sentinels.hosts.split(',');
        if(Array.isArray(sentinelHosts) && sentinelHosts.length > 2){
            var sentinelConnections = [];

            sentinelHosts.forEach(function(item){

                sentinelConnections.push({host: item, port:config.Redis.sentinels.port})

            })

            redisSetting = {
                sentinels:sentinelConnections,
                name: config.Redis.sentinels.name,
                password: redispass
            }

        }else{

            console.log("No enough sentinel servers found .........");
        }

    }
}

var client = undefined;

if(redismode != "cluster") {
    client = new redis(redisSetting);
}else{

    var redisHosts = redisip.split(",");
    if(Array.isArray(redisHosts)){


        redisSetting = [];
        redisHosts.forEach(function(item){
            redisSetting.push({
                host: item,
                port: redisport,
                family: 4,
                password: redispass});
        });

        var client = new redis.Cluster([redisSetting]);

    }else{

        client = new redis(redisSetting);
    }


}

client.on("error", function (err) {
    console.log("Error " + err);
});

function FilterObjFromArray(itemArray, field, value){
    var resultObj;
    if(itemArray) {
        for (var i = 0; i < itemArray.length; i++) {
            var item = itemArray[i];
            var qParams = field.split('.');
            if(qParams && qParams.length >1){
                var qData = item[qParams[0]];
                for(var j=1;j<qParams.length;j++){
                    if(qData) {
                        qData = qData[qParams[j]];
                    }
                }

                if (qData == value) {
                    resultObj = item;
                    break;
                }
            }else {
                if (item[field] == value) {
                    resultObj = item;
                    break;
                }
            }
        }
        return resultObj;
    }else{
        return undefined;
    }
}

function UniqueArray(array) {
    var processed = [];
    if(array && Array.isArray(array)) {
        for (var i = array.length - 1; i >= 0; i--) {
            if (array[i] != null) {
                if (processed.indexOf(array[i]) < 0) {
                    processed.push(array[i]);
                } else {
                    array.splice(i, 1);
                }
            }
        }
        return array;
    }else{
        return [];
    }
}

function UniqueObjectArray(array, field) {
    var processed = [];
    if(array && Array.isArray(array)) {
        for (var i = array.length - 1; i >= 0; i--) {
            if (processed.indexOf(array[i][field]) < 0) {
                processed.push(array[i][field]);
            } else {
                array.splice(i, 1);
            }
        }
        return array;
    }else{
        return [];
    }
}

function GetNewCompanyId(callback){
    client.incr("CompanyCount", function (err, result) {
        if (err) {
            callback(null);
        } else {
            callback(parseInt(result));
        }
    });
}

var AssignPackageToOrganisationLib = function(company, tenant, packageName, requestedUser, callback){
    logger.debug("DVP-UserService.AssignPackageToOrganisation Internal method ");
    logger.debug(packageName);

    var jsonString;

    VPackage.findOne({packageName: packageName}, function(err, vPackage) {
        if (err) {
            jsonString = messageFormatter.FormatMessage(err, "Get Package Failed", false, undefined);
            callback(jsonString);
        }else{
            if(vPackage) {
                Org.findOne({
                    tenant: tenant,
                    id: company
                }).populate('tenantRef').populate({
                    path: 'packageDetails.veeryPackage',
                    populate: {path: 'Package'}
                }).populate('ownerRef', '-password').exec(function (err, org) {

                    if (err) {
                        jsonString = messageFormatter.FormatMessage(err, "Find Organisation Failed", false, undefined);
                        callback(jsonString);
                    } else {
                        if (org) {

                            if(org.ownerRef){

                                UserAccount.findOne({tenant: tenant, company: company, userref: org.ownerRef}).exec(function (err, userAccount) {

                                    if(err){
                                        jsonString = messageFormatter.FormatMessage(err, "Find Organisation Owner Failed", false, undefined);
                                        callback(jsonString);
                                    }else {

                                        var domainData = "127.0.0.1";
                                        if (org.tenantRef && org.tenantRef.rootDomain) {
                                            domainData = org.companyName + "." + org.tenantRef.rootDomain;

                                            if (org.packages.indexOf(packageName) == -1) {
                                                var billingObj = {
                                                    userInfo: requestedUser,
                                                    companyInfo: org,
                                                    name: vPackage.packageName,
                                                    type: vPackage.packageType,
                                                    category: "Veery Package",
                                                    setupFee: vPackage.setupFee ? vPackage.setupFee : 0,
                                                    unitPrice: vPackage.price,
                                                    units: 1,
                                                    description: vPackage.description,
                                                    date: Date.now(),
                                                    valid: true,
                                                    isTrial: false
                                                };

                                                var typeExist = FilterObjFromArray(org.packageDetails, 'veeryPackage.navigationType', vPackage.navigationType);
                                                if (typeExist) {

                                                    if (typeExist.veeryPackage.price <= vPackage.price) {

                                                        RequestToBill(org.id, org.tenant, billingObj, function (err, response) {
                                                            if (err) {
                                                                jsonString = messageFormatter.FormatMessage(err, "Error in Billing request", false, undefined);
                                                                callback(jsonString);
                                                            } else {
                                                                if (response) {
                                                                    if (response.IsSuccess) {
                                                                        try {
                                                                            org.packages.splice(org.packages.indexOf(typeExist.veeryPackage.packageName), 1);
                                                                        } catch (ex) {
                                                                            console.log("No Package Found in the list:: ", ex);
                                                                        }
                                                                        org.packages.push(packageName);
                                                                        org.packages = UniqueArray(org.packages);
                                                                        typeExist.veeryPackage = vPackage._id;
                                                                        typeExist.buyDate = Date.now();

                                                                        SetPackageToOrganisation(company, tenant, domainData, vPackage, org, userAccount._id, function (jsonResponse) {
                                                                            callback(jsonResponse);
                                                                        });
                                                                    } else {
                                                                        jsonString = messageFormatter.FormatMessage(undefined, response.CustomMessage, false, undefined);
                                                                        callback(jsonString);
                                                                    }
                                                                } else {
                                                                    jsonString = messageFormatter.FormatMessage(err, "Error in Billing request", false, undefined);
                                                                    callback(jsonString);
                                                                }
                                                            }
                                                        });

                                                    } else {
                                                        jsonString = messageFormatter.FormatMessage(undefined, "Cannot downgrade package, Please contact your system administrator", false, undefined);
                                                        callback(jsonString);
                                                    }

                                                } else {
                                                    org.updated_at = Date.now();
                                                    org.packages.push(packageName);
                                                    org.packages = UniqueArray(org.packages);
                                                    org.packageDetails.push({veeryPackage: vPackage._id, buyDate: Date.now()});

                                                    if (vPackage.price > 0) {
                                                        RequestToBill(org.id, org.tenant, billingObj, function (err, response) {
                                                            if (err) {
                                                                jsonString = messageFormatter.FormatMessage(err, "Error in Billing request", false, undefined);
                                                                callback(jsonString);
                                                            } else {
                                                                if (response) {
                                                                    if (response.IsSuccess) {
                                                                        SetPackageToOrganisation(company, tenant, domainData, vPackage, org, userAccount._id, function (jsonResponse) {
                                                                            callback(jsonResponse);
                                                                        });
                                                                    } else {
                                                                        jsonString = messageFormatter.FormatMessage(undefined, response.CustomMessage, false, undefined);
                                                                        callback(jsonString);
                                                                    }
                                                                } else {
                                                                    jsonString = messageFormatter.FormatMessage(err, "Error in Billing request", false, undefined);
                                                                    callback(jsonString);
                                                                }
                                                            }
                                                        });
                                                    } else {
                                                        SetPackageToOrganisation(company, tenant, domainData, vPackage, org, userAccount._id, function (jsonResponse) {
                                                            callback(jsonResponse);
                                                        });
                                                    }
                                                }
                                            } else {
                                                jsonString = messageFormatter.FormatMessage(err, "Package Already Added", false, undefined);
                                                callback(jsonString);
                                            }

                                        } else {
                                            jsonString = messageFormatter.FormatMessage(err, "No Tenant Data Found", false, undefined);
                                            callback(jsonString);
                                        }

                                    }
                                });

                            }else {
                                jsonString = messageFormatter.FormatMessage(err, "Find Organisation Owner Failed", false, undefined);
                                callback(jsonString);
                            }

                        } else {
                            jsonString = messageFormatter.FormatMessage(err, "Find Organisation Failed", false, undefined);
                            callback(jsonString);
                        }
                    }

                });
            }else{
                jsonString = messageFormatter.FormatMessage(err, "Find Packahe Failed", false, undefined);
                callback(jsonString);
            }
        }
    });
};

var SetPackageToOrganisation = function(company, tenant, domainData, vPackage, org, userAccountId, callback){
    var jsonString;

    if(vPackage.spaceLimit && vPackage.spaceLimit.length >0){
        var spaceLimitsToAdd = [];
        vPackage.spaceLimit.forEach(function (sLimit) {
            var existingSpaceLimit = org.spaceLimit.filter(function (esl) {
                return esl && sLimit &&  esl.spaceType === sLimit.spaceType;
            });

            if(existingSpaceLimit && existingSpaceLimit.length > 0){
                if(existingSpaceLimit[0].spaceLimit < sLimit.spaceLimit) {
                    existingSpaceLimit[0].spaceLimit = sLimit.spaceLimit;
                }
            }else{
                spaceLimitsToAdd.push(sLimit);
            }
        });

        if(spaceLimitsToAdd && spaceLimitsToAdd.length >0) {
            org.spaceLimit = org.spaceLimit.concat(spaceLimitsToAdd);
        }
    }

    if (vPackage.consoleAccessLimit && vPackage.consoleAccessLimit.length > 0) {
        for (var i = 0; i < vPackage.consoleAccessLimit.length; i++) {
            var vCal = vPackage.consoleAccessLimit[i];
            var tempCal = {
                accessType: vCal.accessType,
                accessLimit: vCal.accessLimit,
                currentAccess: []
            };
            var count = 0;
            if (org.consoleAccessLimits.length > 0) {
                for (var j = 0; j < org.consoleAccessLimits.length; j++) {
                    count++;
                    var cal = org.consoleAccessLimits[j];
                    if (cal.accessType == vCal.accessType) {
                        org.consoleAccessLimits[j].accessLimit = tempCal.accessLimit;
                        break;
                    }
                    if (count == org.consoleAccessLimits.length) {
                        org.consoleAccessLimits.push(tempCal);

                        if (vCal.accessType == "admin") {
                            tempCal.currentAccess.push(org.ownerId);
                        }
                    }
                }
            } else {
                org.consoleAccessLimits.push(tempCal);
            }
        }
    }

    //adding concurrent access 
    if (vPackage.concurrentAccessLimit && vPackage.concurrentAccessLimit.length > 0) {
        for (var i = 0; i < vPackage.concurrentAccessLimit.length; i++) {
            var vCal = vPackage.concurrentAccessLimit[i];
            var tempCal = {
                accessType: vCal.accessType,
                accessLimit: vCal.accessLimit,
                currentAccess: []
            };
            var count = 0;
            if (org.concurrentAccessLimit.length > 0) {
                for (var j = 0; j < org.concurrentAccessLimit.length; j++) {
                    count++;
                    var cal = org.concurrentAccessLimit[j];
                    if (cal.accessType == vCal.accessType) {
                        org.concurrentAccessLimit[j].accessLimit = tempCal.accessLimit;
                        break;
                    }
                    if (count == org.concurrentAccessLimit.length) {
                        org.concurrentAccessLimit.push(tempCal);

                        if (vCal.accessType == "admin") {
                            tempCal.currentAccess.push(org.ownerId);
                        }
                    }
                }
            } else {
                org.concurrentAccessLimit.push(tempCal);
            }
        }
    }

    var er = ExtractResources(vPackage.resources);
    er.on('endExtractResources', function (userScopes) {
        if (userScopes) {
            for (var i = 0; i < userScopes.length; i++) {
                var scopes = userScopes[i];
                var eUserScope = FilterObjFromArray(org.resourceAccessLimits, "scopeName", scopes.scope);

                if (!org.resourceAccessLimits) {
                    org.resourceAccessLimits = [];
                }

                if (eUserScope) {
                    if (eUserScope.accessLimit != -1 && eUserScope.accessLimit < scopes.accessLimit) {
                        eUserScope.accessLimit = scopes.accessLimit;
                    }
                } else {
                    var rLimit = {
                        "scopeName": scopes.scope,
                        "accessLimit": scopes.accessLimit
                    };
                    org.resourceAccessLimits.push(rLimit);
                }
            }
        }


        Org.findOneAndUpdate({tenant: tenant, id: company}, org, function (err, rOrg) {
            if (err) {
                jsonString = messageFormatter.FormatMessage(err, "Assign Package to Organisation Failed", false, undefined);
            } else {
                // UpdateUser(org.ownerId, vPackage);
                UpdateUser(userAccountId, vPackage);
                AssignTaskToOrganisation(company, tenant, vPackage.veeryTask);
                AssignContextAndCloudEndUserToOrganisation(company, tenant, domainData);
                jsonString = messageFormatter.FormatMessage(err, "Assign Package to Organisation Successful", true, org);
            }
            callback(jsonString);
        });
    });
};

function AssignTaskToOrganisation(company, tenant, taskList){
    var taskInfoUrl = util.format("http://%s/DVP/API/%s/ResourceManager/TaskInfo",config.Services.resourceServiceHost, config.Services.resourceServiceVersion);
    var taskUrl = util.format("http://%s/DVP/API/%s/ResourceManager/Task",config.Services.resourceServiceHost, config.Services.resourceServiceVersion);
    if(config.Services.dynamicPort || validator.isIP(config.Services.resourceServiceHost))
    {
        taskUrl = util.format("http://%s:%s/DVP/API/%s/ResourceManager/Task", config.Services.resourceServiceHost, config.Services.resourceServicePort, config.Services.resourceServiceVersion);
        taskInfoUrl = util.format("http://%s:%s/DVP/API/%s/ResourceManager/TaskInfo", config.Services.resourceServiceHost, config.Services.resourceServicePort, config.Services.resourceServiceVersion);
    }
    var companyInfo = util.format("%d:%d", tenant, company);
    restClientHandler.DoGet(companyInfo, taskInfoUrl, "", function (err, res1, result) {
        if (err) {
            console.log(err);
        }
        else {
            var jResult = JSON.parse(result);
            for(var i in taskList) {
                var task = FilterObjFromArray(jResult.Result,"TaskType",taskList[i]);
                if(task) {
                    var body = {"TaskInfoId": task.TaskInfoId};
                    if(task.TaskType == "CALL" || task.TaskType == "CHAT"){
                        body.AddToProductivity = true;
                    }else{
                        body.AddToProductivity = false;
                    }
                    restClientHandler.DoPost(companyInfo, taskUrl, body, function (err, res1, result) {
                        if (err) {
                            console.log(err);
                        }
                        else {
                            console.log("Assign Task Success");
                        }
                    });
                }
            }
        }
    });
}

function AssignContextAndCloudEndUserToOrganisation(company, tenant, domain){
    var contextUrl = util.format("http://%s/DVP/API/%s/SipUser/Context",config.Services.sipuserendpointserviceHost, config.Services.sipuserendpointserviceVersion);
    var transferCodesUrl = util.format("http://%s/DVP/API/%s/SipUser/TransferCode",config.Services.sipuserendpointserviceHost, config.Services.sipuserendpointserviceVersion);
    var cloudEndUserUrl = util.format("http://%s/DVP/API/%s/CloudConfiguration/CloudEndUser",config.Services.clusterconfigserviceHost, config.Services.clusterconfigserviceVersion);
    if(config.Services.dynamicPort || validator.isIP(config.Services.resourceServiceHost))
    {
        cloudEndUserUrl = util.format("http://%s:%s/DVP/API/%s/CloudConfiguration/CloudEndUser", config.Services.clusterconfigserviceHost, config.Services.sipuserendpointservicePort, config.Services.clusterconfigserviceVersion);
        contextUrl = util.format("http://%s:%s/DVP/API/%s/SipUser/Context", config.Services.sipuserendpointserviceHost, config.Services.clusterconfigservicePort, config.Services.sipuserendpointserviceVersion);
        transferCodesUrl = util.format("http://%s:%s/DVP/API/%s/SipUser/TransferCode",config.Services.sipuserendpointserviceHost, config.Services.sipuserendpointservicePort, config.Services.sipuserendpointserviceVersion);
    }
    var companyInfo = util.format("%d:%d", tenant, company);
    var contextReqBody = {
        ContextCat: 'INTERNAL',
        Context: util.format("%d_%d_CONTEXT",tenant, company),
        Description: 'Default Internal Context',
        ClientTenant: tenant,
        ClientCompany: company

    };
    restClientHandler.DoPost(companyInfo, contextUrl, contextReqBody, function (err, res1, result) {
        if (err) {
            console.log(err);
        }
        else {
            var companyInfoForCloudEndUser = util.format("%d:%d", 1, 1);
            var cloudEndUserReqBody = {
                ClusterID: 1,
                Domain: domain,
                Provision: 2,
                ClientTenant: tenant,
                ClientCompany: company
            };
            console.log("Assign context Success: ", result);
            restClientHandler.DoPost(companyInfoForCloudEndUser, cloudEndUserUrl, cloudEndUserReqBody, function (err, res1, result) {
                if (err) {
                    console.log(err);
                }
                else {
                    console.log("Assign cloudEndUser Success: ", result);
                }
            });

            var transferCodesBody = {
                InternalTransfer: 3,
                ExternalTransfer: 6,
                GroupTransfer: 4,
                ConferenceTransfer: 5
            };

            restClientHandler.DoPost(companyInfo, transferCodesUrl, transferCodesBody, function (err, res1, result) {
                if (err) {
                    console.log(err);
                }
                else {
                    console.log("Assign transfer codes Success: ", result);
                }
            });
        }
    });
}

function GetUserScopes(scopes){
    var e = new EventEmitter();
    process.nextTick(function () {
        if (scopes && Array.isArray(scopes)) {
            var count = 0;
            for (var i =0; i < scopes.length; i++) {
                count++;
                var userScope = {};
                var oScope = scopes[i];
                if(oScope) {
                    userScope.scope = oScope.scopeName;
                    userScope.accessLimit = oScope.limit;
                    if(oScope.actions) {
                        for (var j = 0; j < oScope.actions.length; j++) {
                            var action = oScope.actions[j];
                            if (action) {
                                switch (action) {
                                    case 'read':
                                        userScope.read = true;
                                        break;
                                    case 'write':
                                        userScope.write = true;
                                        break;
                                    case 'delete':
                                        userScope.delete = true;
                                        break;
                                }
                            }
                        }
                    }
                    if(userScope) {
                        e.emit('getUserScopes', userScope);
                    }
                }
                if(count == scopes.length){
                    e.emit('endGetUserScopes');
                }
            }
        }else {
            e.emit('endGetUserScopes');
        }
    });

    return (e);
}

function ExtractResources(resources){
    var e = new EventEmitter();
    process.nextTick(function () {
        if (resources && Array.isArray(resources) && resources.length > 0) {
            var count = 0;
            var userScopes = [];
            for (var i = 0; i< resources.length; i++) {
                var resource = resources[i];
                var gus  = GetUserScopes(resource.scopes);
                gus.on('getUserScopes', function(scope){
                    if(scope){
                        userScopes.push(scope);
                    }
                });
                gus.on('endGetUserScopes', function(){
                    count++;
                    if(count == resources.length){
                        e.emit('endExtractResources', userScopes);
                    }
                });
            }
        }else {
            e.emit('endExtractResources', []);
        }
    });

    return (e);
}

function ExtractConsoles(consoles, navigationType){
    var e = new EventEmitter();
    process.nextTick(function () {
        if (consoles && Array.isArray(consoles)) {
            logger.debug("consoles Length: "+ consoles.length);
            var count = 0;
            var consoleScopes = [];
            for (var i = 0; i< consoles.length;i++) {
                var consoleName = consoles[i];
                logger.debug("consoleName: "+ consoleName);
                Console.findOne({consoleName: consoleName}, function(err, rConsole) {
                    if (err) {
                        jsonString = messageFormatter.FormatMessage(err, "Get Console Failed", false, undefined);
                        console.log(jsonString);
                    }else{
                        if(rConsole) {
                            logger.debug("Result consoleName: " + rConsole.consoleName);
                            var consoleScope = {consoleName: rConsole.consoleName, menus: []};
                            if(rConsole.consoleNavigation) {
                                for (var j = 0; j < rConsole.consoleNavigation.length; j++) {
                                    var navigation = rConsole.consoleNavigation[j];
                                    if (navigation && navigation.navigationName && navigation.resources && navigation.navigationTypes.indexOf(navigationType)>-1) {
                                        var menuScope = {menuItem: navigation.navigationName, menuAction: []};
                                        for (var k = 0; k < navigation.resources.length; k++) {
                                            var navigationResource = navigation.resources[k];
                                            if (navigationResource && navigationResource.scopes) {
                                                for (var l = 0; l < navigationResource.scopes.length; l++) {
                                                    var navigationResourceScope = navigationResource.scopes[l];
                                                    if (navigationResourceScope) {
                                                        var scope = {
                                                            scope: navigationResourceScope.scopeName,
                                                            feature: navigationResourceScope.feature
                                                        };
                                                        if(navigationResourceScope.actions) {
                                                            for (var m = 0; m < navigationResourceScope.actions.length; m++) {
                                                                var action = navigationResourceScope.actions[m];
                                                                if (action) {
                                                                    switch (action) {
                                                                        case 'read':
                                                                            scope.read = true;
                                                                            break;
                                                                        case 'write':
                                                                            scope.write = true;
                                                                            break;
                                                                        case 'delete':
                                                                            scope.delete = true;
                                                                            break;
                                                                    }
                                                                }
                                                            }
                                                        }
                                                        if (scope) {
                                                            menuScope.menuAction.push(scope);
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                        consoleScope.menus.push(menuScope);
                                    }
                                }
                            }
                            count++;
                            consoleScopes.push(consoleScope);
                        }
                    }

                    if(count == consoles.length){
                        e.emit('endExtractConsoles',consoleScopes);
                    }
                });
            }
        }else {
            e.emit('endExtractConsoles',[]);
        }
    });

    return (e);
}

function UpdateUser(userAccountId, vPackage){
    var jsonString;
    UserAccount.findOne({_id: userAccountId}, function(err, userAccount) {
        if (err) {
            jsonString = messageFormatter.FormatMessage(err, "Find User Account Failed", false, undefined);
            return jsonString;
        } else {
            var fixUserScopes = [
                {scope: "user", read: true, write: true, delete: true},
                {scope: "userProfile", read: true, write: true, delete: true},
                {scope: "organisation", read: true, write: true},
                {scope: "resource", read: true},
                {scope: "package", read: true},
                {scope: "console", read: true},
                {scope: "userScope", read: true, write: true, delete: true},
                {scope: "userAppScope", read: true, write: true, delete: true},
                {scope: "userMeta", read: true, write: true, delete: true},
                {scope: "userAppMeta", read: true, write: true, delete: true},
                {scope: "client", read: true, write: true, delete: true},
                {scope: "clientScope", read: true, write: true, delete: true}
            ];
            var er = ExtractResources(vPackage.resources);
            er.on('endExtractResources', function(userScopes){
                userScopes = userScopes.concat(fixUserScopes);
                var uScopes = UniqueObjectArray(userScopes,"scope");
                if(uScopes) {
                    for (var i = 0; i < uScopes.length; i++) {
                        var eUserScope = FilterObjFromArray(userAccount.user_scopes, "scope", uScopes[i]);
                        if (eUserScope) {
                            if (uScopes[i].read && (!eUserScope.read || eUserScope.read == false)) {
                                eUserScope.read = uScopes[i].read;
                            }
                            if (uScopes[i].write && (!eUserScope.write || eUserScope.write == false)) {
                                eUserScope.write = uScopes[i].write;
                            }
                            if (uScopes[i].delete && (!eUserScope.delete || eUserScope.delete == false)) {
                                eUserScope.delete = uScopes[i].read;
                            }
                        } else {
                            userAccount.user_scopes.push(uScopes[i]);
                        }
                    }
                }
                var ec = ExtractConsoles(vPackage.consoles, vPackage.navigationType);
                ec.on('endExtractConsoles', function(clientScopes){
                    if(clientScopes) {
                        for (var j = 0; j < clientScopes.length; j++) {
                            if(userAccount.client_scopes && userAccount.client_scopes.length > 0) {
                                var existingClientScope = FilterObjFromArray(userAccount.client_scopes, "consoleName", clientScopes[j].consoleName);

                                if(existingClientScope){
                                    clientScopes[j].menus.forEach(function (cScopeMenu) {
                                        if(cScopeMenu){

                                            existingClientScope.menus.push(cScopeMenu);
                                        }
                                    });
                                }else{
                                    userAccount.client_scopes.push(clientScopes[j]);
                                }
                            }else {
                                userAccount.client_scopes.push(clientScopes[j]);
                            }
                        }
                    }

                    userAccount.client_scopes = UniqueObjectArray(userAccount.client_scopes,"consoleName");
                    if(userAccount.client_scopes) {
                        for (var k = 0; k < userAccount.client_scopes.length; k++) {
                            var ucs = userAccount.client_scopes[k];
                            ucs.menus = UniqueObjectArray(ucs.menus, "menuItem");
                            if(ucs.menus) {
                                for (var l = 0; l < ucs.menus.length; l++) {
                                    var menu1 = ucs.menus[l];
                                    if(menu1) {
                                        for (var m = 0; m < menu1.menuAction.length; m++) {
                                            var menuAction = FilterObjFromArray(userAccount.user_scopes, "scope", menu1.menuAction[m].scope);
                                            if (menuAction) {
                                                if (menu1.menuAction[m].read) {
                                                    menuAction.read = menu1.menuAction[m].read;
                                                }
                                                if (menu1.menuAction[m].write) {
                                                    menuAction.write = menu1.menuAction[m].write;
                                                }
                                                if (menu1.menuAction[m].delete) {
                                                    menuAction.delete = menu1.menuAction[m].delete;
                                                }
                                            } else {
                                                var mAction = {scope: menu1.menuAction[m].scope};
                                                if (menu1.menuAction[m].read) {
                                                    mAction.read = menu1.menuAction[m].read;
                                                }
                                                if (menu1.menuAction[m].write) {
                                                    mAction.write = menu1.menuAction[m].write;
                                                }
                                                if (menu1.menuAction[m].delete) {
                                                    mAction.delete = menu1.menuAction[m].delete;
                                                }
                                                userAccount.user_scopes.push(mAction);
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                    userAccount.user_scopes = UniqueObjectArray(userAccount.user_scopes,"scope");
                    UserAccount.findOneAndUpdate({_id: userAccountId}, userAccount, function (err, rUser) {
                        if (err) {
                            jsonString = messageFormatter.FormatMessage(err, "Update User Scopes Failed", false, undefined);
                        } else {
                            jsonString = messageFormatter.FormatMessage(err, "Update User Scopes Successful", true, userAccount);
                        }
                        return jsonString;
                    });
                });
            });
        }
    });
}

function CreateOrganisationStanAlone(user, companyname, timezone, callback) {
    logger.debug("DVP-UserService.CreateOrganisationStanAlone Internal method ");

    GetNewCompanyId(function (cid) {
        if (cid && cid > 0) {


            if (user.company === 0) {
                logger.info("DVP-UserService.CreateOrganisationStanAlone Active Tenant: "+ config.Tenant.activeTenant);
                Tenant.findOne({id: config.Tenant.activeTenant}, function (err, Tenants) {
                    if (err) {

                        callback(err, undefined);

                    } else {

                        if (Tenants) {

                            var company =user.username;

                            if(companyname)
                                company = companyname;

                            var org = Org({
                                ownerId: user.username,
                                companyName: company,
                                companyEnabled: true,
                                id: cid,
                                tenant: Tenants.id,
                                packages: [],
                                consoleAccessLimits: [],
                                concurrentAccessLimit:[],
                                tenantRef: Tenants._id,
                                ownerRef: user._id,
                                created_at: Date.now(),
                                updated_at: Date.now(),
                                timeZone: timezone
                            });
                            // var usr = {};
                            // usr.company = cid;
                            // usr.Active = true;
                            // usr.updated_at = Date.now();

                            org.save(function (err, org) {
                                if (err) {
                                    callback(err, undefined);
                                } else {

                                    var userAccount = UserAccount({
                                        active: true,
                                        verified: true,
                                        joined: Date.now(),
                                        user: user.username,
                                        userref: user._id,
                                        tenant: org.tenant,
                                        company: org.id,
                                        user_meta: {role: "admin"},
                                        app_meta: {},
                                        user_scopes: [
                                            {scope: "organisation", read: true, write: true},
                                            {scope: "resource", read: true},
                                            {scope: "package", read: true},
                                            {scope: "console", read: true},
                                            {"scope": "myNavigation", "read": true},
                                            {"scope": "myUserProfile", "read": true}
                                        ],
                                        created_at: Date.now(),
                                        updated_at: Date.now(),
                                        multi_login: false
                                    });

                                    userAccount.save(function (err, account) {
                                        if (err) {
                                            org.remove(function (err) {
                                            });
                                            callback(err, undefined);
                                        } else {
                                            //rUser.company = cid;
                                            AssignPackageToOrganisationLib(cid, Tenants.id, "BASIC", user,function(jsonString){
                                                console.log(jsonString);
                                            });
                                            callback(undefined, user);
                                        }
                                    });

                                        // User.findOneAndUpdate({username: user.username}, usr, function (err, rUser) {
                                        //     if (err) {
                                        //         org.remove(function (err) {
                                        //         });
                                        //         callback(err, undefined);
                                        //     } else {
                                        //         rUser.company = cid;
                                        //         AssignPackageToOrganisationLib(cid, Tenants.id, "BASIC", rUser,function(jsonString){
                                        //             console.log(jsonString);
                                        //         });
                                        //         callback(undefined, rUser);
                                        //     }
                                        // });
                                }
                            });

                        } else {
                            callback(new Error("No tenants found"), undefined);
                        }
                    }
                });


            }


        } else {
            callback(new Error("ID generation failed"), undefined);
        }
    });
}

function RequestToBill(company, tenant, billInfo, callback){
    try {
        var contextUrl = util.format("http://%s/DVP/API/%s/Billing/BuyPackage", config.Services.billingserviceHost, config.Services.billingserviceVersion);
        if (config.Services.dynamicPort || validator.isIP(config.Services.billingserviceHost)) {
            contextUrl = util.format("http://%s:%s/DVP/API/%s/Billing/BuyPackage", config.Services.billingserviceHost, config.Services.billingservicePort, config.Services.billingserviceVersion);
        }
        var companyInfo = util.format("%d:%d", tenant, company);
        restClientHandler.DoPost(companyInfo, contextUrl, billInfo, function (err, res1, result) {
            if(err){
                callback(err, undefined);
            }else{
                if(res1.statusCode === 200) {
                    callback(undefined, JSON.parse(result));
                }else{
                    callback(new Error(result), undefined);
                }
            }
        });
    }catch(ex){
        callback(ex, undefined);
    }
}

module.exports.CreateOrganisationStanAlone = CreateOrganisationStanAlone;
module.exports.redisClient = client;
