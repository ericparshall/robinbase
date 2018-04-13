module.exports = function (App)
{
    var express = require('express');
    var adminRouter = express.Router();
    var Debug = require('../Debug.js');
    var Lets = require('../Lets.js');
    var Config = require('../../config.js');
    var async = require('async');
    var loadAuthorization = require('../auth/loadAuthorizationMiddleware')(Config);

    var singletonRouters = App.getSingletonRouters();
    var modelRouters = App.getModelRouters();

    var defData = {
        title:Config.RB_PROJECT_TITLE || "Admin Panel"
    }

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
        processData.view = processData.view || {};
        processData.project = Object.assign({}, defData);
        var viewModels = [];
        Object.keys(myViews).forEach(function(key)
        {
            if (res.locals.modelPath == myViews[key].route)
            {
                myViews[key].active = 'active';
            }
            else
            {
                myViews[key].active = '';
            }
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
        if (Array.isArray(Config.RB_SIDEBAR_ORDER))
        {
            processData.models = [];
         //   console.log('RB_SIDEBAR_EXCLUDE', Config.RB_SIDEBAR_EXCLUDE);
            var excludeModels = new Set(Array.isArray(Config.RB_SIDEBAR_EXCLUDE) ? Config.RB_SIDEBAR_EXCLUDE : []);
            Config.RB_SIDEBAR_ORDER.forEach(key => {
                if (excludeModels.has(key))
                {
                    return;
                }
                if (myViews[key])
                {
                    if (res.locals.authorizations[key])
                    {
                        if (!res.locals.authorizations[key].isAccessDenied("view"))
                        {
                            processData.models.push(myViews[key]);
                        }
                    }
                    else
                    {
                        processData.models.push(myViews[key]);
                    }
                }
            });

            Object.keys(myViews).forEach(key => {
                if (excludeModels.has(key))
                {
                    return;
                }
                if (!Config.RB_SIDEBAR_ORDER.includes(key))
                {

                    if (res.locals.authorizations[key])
                    {
                        if (!res.locals.authorizations[key].isAccessDenied("view"))
                        {
                            processData.models.push(myViews[key]);
                        }
                    }
                    else
                    {
                        processData.models.push(myViews[key]);
                    }
                }
            });
        }

        processData.primaryColor = Config.RB_COLOR_PRIMARY;
        processData.secondaryColor = Config.RB_COLOR_SECONDARY;

        processData.isLoggedIn = false;
        processData.authLink = '';
        processData.route = res.locals.modelPath;
        processData.authorization = res.locals.authorization ? res.locals.authorization.data : {};

        processData.modelViewHelper = {};
        if (res.locals.view && res.locals.view.name)
        {
            processData.modelViewHelper.modelName = res.locals.view.name;
        }
        processData.view = res.locals.view || {};

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
            else
            {
                if (Array.isArray(path))
                {
                    processData.authLink = path.map(function(link){
                        var linkText = "Sign In";
                        if (path.length > 1)
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
        if (res.locals.apiMode == true || res.locals.isJson)
        {
            Debug.debug('API MODE: ', res.locals.apiMode, 'IS JSON: ', res.locals.isJson)
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

            if ((typeof processData.dataSource != 'undefined') &&
                (typeof processData.view != 'undefined') &&
                (typeof processData.view.titleKey == 'string'))
            {
                processData.project.title = processData.dataSource[processData.view.titleKey] || processData.view.name;
            }
            else
            {
                if ((typeof processData.view != 'undefined') && (typeof processData.view.name != 'undefined'))
                {
                    processData.project.title = `${processData.view.name} - ${processData.project.title}`;
                }
                else
                {
                    if (typeof processData.project == 'undefined')
                    {
                        processData.project = {title:''};
                    }
                    else
                    {
                        processData.project.title = `${processData.project.title}`;
                    }
                    processData.project.title = `${processData.project.title}`;
                }

            }


            processData.allowedActions = App.getAllowedActions(processData.context, res.locals.authorization, myModels[res.locals.modelKey], processData.isRoot);

            if (processData.view && processData.urlInfo)
            {
                let subLinks = [];

                if (typeof processData.view.subLinks == 'function')
                {
                    subLinks = processData.view.subLinks(processData.context, res.locals.authorization);
                }
                else
                {
                    subLinks = processData.view.subLinks;
                }

                if (Array.isArray(subLinks))
                {
                    processData.allowedActions = processData.allowedActions.concat(subLinks);
                }



                var currentPath = processData.urlInfo.path;
                for (var i = 0; i < processData.allowedActions.length; i++) {
                    if (currentPath == processData.allowedActions[i].path) {
                        processData.allowedActions[i].active = 'active';
                    }
                    else {
                        processData.allowedActions[i].active = '';
                    }
                }
            }


            res.html(template, processData);
        }
    }

    adminRouter.use(loadAuthorization);

    singletonRouters.forEach(function(buildRouter)
    {
        const router = buildRouter(out, buildProcess);
        if (router)
        {
            adminRouter.use(router);
        }
    });

    adminRouter.use(function(req, res, next) {
        if (req.accepts('json') && !req.accepts('html')) {
            res.locals.isJson = true;
        }

        next();
    });

    adminRouter.use(function(req, res, next) {
        if (Config.RB_ENFORCE_AUTHENTICATION == 1 && !res.locals.apiMode)
       {
            let processData = buildProcess(req, res);

            if (!processData.isLoggedIn &&  req.path !== processData.loginURL)
            {
                 console.log('REQ URL', req.path);
                 console.log('LOGIN URL', processData.loginURL);
                return res.redirect(processData.loginURL);
            }
        }

        next();
    });

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
        var routePath = myViews[key].route || myViews[key].name.toLowerCase();
        var validGetActions = ['view', 'edit'];
        var validPostActions = ['save'];

        const route = myViews[key].route || key;
        const routers = modelRouters.map(function(createRouter)
        {
            return createRouter(myModels[key], route, out, buildProcess);
        });

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

    return adminRouter;
}