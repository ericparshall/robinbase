(function(){

    var express = require('express');
    var adminRouter = express.Router();
    var Debug = require('../helpers/Debug.js');
    var Lets = require('../helpers/Lets.js');
    var Config = require('../config.js');
    var async = require('async');
    var loadAuthorization = require('../helpers/auth/loadAuthorizationMiddleware')(Config);

    Debug.deprecate("The admin routes file has been deprecated and will be removed in a future version of this module.  Please use 'app.buildAdminRouter()' instead.");

    var defData = {
        title:Config.RB_PROJECT_TITLE || "Admin Panel"
    };

    var myRoutes = {};
    var myModels = {};
    var myViews = {};
    var myAuth = {};

    for (var key in Config.adminModels)
    {
        if (Config.adminModels[key].view)
        {
            myRoutes[Config.adminModels[key].view.route || key] = key;
        }
        myModels[key] = Config.adminModels[key];
        myViews[key] = Config.adminModels[key].view;
    }

    for (var key in Config.allModels)
    {
        myAuth[key] = Config.allModels[key].auth;
    }

    var buildProcess = function(req, res)
    {
        var processData = req.defaultProcessData();
        processData.project = defData;
        var viewModels = [];
        Object.keys(myViews).forEach(function(key)
        {
            if (res.locals.authorizations[key])
            {
                if (!res.locals.authorizations[key].isAccessDenied("view"))
                {
                    viewModels.push(myViews[key]);
                }
            }
            else
            {
                viewModels.push(myViews[key]);
            }
        })
        processData.models = viewModels;
        
        processData.primaryColor = Config.RB_COLOR_PRIMARY;
        processData.secondaryColor = Config.RB_COLOR_SECONDARY;

        processData.isLoggedIn = false;
        processData.authLink = '';
        processData.route = res.locals.modelPath;

        var isPublicAuth;
        if (Config.RB_PRIMARY_AUTH && Config.RB_PRIMARY_AUTH !== '__noauth__')
        {
            var authData = null;
            var loggedInAs = Config.RB_PRIMARY_AUTH;

            if (req.session)
            {
                req.session.auth = req.session.auth || {};
                if (Array.isArray(Config.RB_PRIMARY_AUTH))
                {
                    processData.isLoggedIn = Config.RB_PRIMARY_AUTH.reduce(function(loggedIn, key)
                    {
                        req.session.auth[key] = req.session.auth[key] || {};
                        authData = req.session.auth[key];
                        if (loggedIn)
                        {
                            return loggedIn;
                        }

                        var thisIsLoggedIn = myAuth[key].isLoggedIn(authData) && !myAuth[key].isPublicAuth;
                        if (thisIsLoggedIn)
                        {
                            loggedInAs = key;
                        }

                        return thisIsLoggedIn;

                    }, false);
                }
                else
                {
                    req.session.auth[Config.RB_PRIMARY_AUTH] = req.session.auth[Config.RB_PRIMARY_AUTH] || {};

                    authData = req.session.auth[Config.RB_PRIMARY_AUTH];
                    processData.isLoggedIn = myAuth[Config.RB_PRIMARY_AUTH].isLoggedIn(authData);
                }
            }

            // TODO: Move this logic to the templates
            var path = loggedInAs;
            if (Array.isArray(path))
            {
                processData.loginURL = '/'+path[0]+'/login';
            }
            else
            {
                processData.loginURL = '/'+path+'/login';
            }
            if (processData.isLoggedIn)
            {
                processData.authLink = '<a href="/'+path+'/logout" class="logout link">Sign Out <i class="fa fa-sign-out" aria-hidden="true"></i></a>';
            }
            else if(!res.locals.apiMode)
            {
                if (Array.isArray(path))
                {
                    processData.authLink = path.map(function(link){
                        var linkText = "Sign In";
                        if (path.length > 1 && myViews[link])
                        {
                            linkText = myViews[link].name +' Sign In';
                        }
                        return '<a style="margin-left: 10px;" href="/'+myViews[link].route+'/login" class="logout link">'+ linkText +' <i class="fa fa-sign-in" aria-hidden="true"></i></a>'
                    }).join('')
                }
                else
                {
                    processData.authLink = '<a href="/'+myViews[path].route+'/login" class="logout link">Sign In <i class="fa fa-sign-in" aria-hidden="true"></i></a>';
                }
            }

        }


        return processData;
    }

    function loadAuthorizationData(authData, callback)
    {
        Lets.authorize(authData, callback);
    }

    function out(res, template, processData)
    {
        if (res.locals.apiMode == true)
        {
            delete processData.query;
            delete processData.body;
            delete processData.params;
            delete processData.objId;
            delete processData.obj;
            delete processData.view;
            delete processData.tableModel;
            if (typeof processData.error != 'undefined')
            {
                res.showError(processData.error.message || processData.error);
            }
            else if (typeof processData.warning != 'undefined')
            {
                res.showError(processData.warning);
            }
            else
            {
                if (res.locals.verbose == true)
                {
                    return res.respond(processData);
                }
                res.respond(processData.dataSource || {});
            }
        }
        else
        {
            res.html(template, processData);
        }
    }

    adminRouter.use(loadAuthorization);


    adminRouter.get('/', function (req, res, next) {
        if (res.locals.apiMode)
        {
            return next();
        }
        var processData = buildProcess(req, res);
        //return next();
        out(res, 'templates.admin.main', processData);
    });

    for (var key in myViews)
    {
        var routePath = myViews[key].route || myViews[key].name.toLowerCase;
        var validGetActions = ['view', 'edit'];
        var validPostActions = ['save'];

        //myViews[i].
        // var currModel = myViews[i];

        const routers = [
            require('../helpers/routes/createModelBaseRouter.js')(myModels[key], key, out, buildProcess),
            require('../helpers/routes/createAuthRouter.js')(myModels[key], key, out, buildProcess),
            require('../helpers/routes/createCrudRouter.js')(myModels[key], key, out, buildProcess),
        ]

        routers.forEach(function(router)
        {
            if (router)
            {
                adminRouter.use(router);
            }
        })
    }

    adminRouter.use(function(err, req, res, next) {
        var processData =  {};
        if (req.method != 'GET' || res.locals.apiMode)
        {
            res.showError(err.message || err);
        }
        else
        {
            processData.error = err.message || err;
            Debug.error("issue with request.  Server is still running.", err);
            out(res, 'templates.admin.error', processData);
        }
    });


    adminRouter.all("/*", function (req, res) {
        if (req.method != 'GET' || res.locals.apiMode)
        {
            res.showError("Not found", 404);
        }
        else
        {
            var processData = buildProcess(req, res);
            processData.warning = "Could not find the requested page";
            out(res, 'templates.admin.warning', processData);
        }
    });


    module.exports = adminRouter;
}).call(this);