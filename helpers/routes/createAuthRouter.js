const express = require('express');

module.exports = function createModelBaseRouter(Model, modelKey, out, buildProcess)
{
    const Config = require('../../config.js');
    const Lets = require('../Lets.js');
    const router = express.Router();
    const view = Model.view || {};
    const route = view.route;
    const auth = Model.auth;
    if (!auth)
    {
        return null;
    }

    if (auth.login)
    {
        router.get(`/${route}/login`, function(req, res, next) {
            if (res.locals.apiMode == true)
            {
                // don't need this for api
                return next();
            }

            var processData = buildProcess(req, res);
            processData.context = 'auth';

            var obj = new Model(req.query);
            processData.obj = JSON.stringify(obj);
            delete processData.models;
            processData.isLogin = true;
            var template = 'templates.admin.login';
            if (res.locals.view.templates && res.locals.view.templates.login)
            {
                template = res.locals.view.templates.login;
            }
            out(res, template, processData);
        });

        router.post(`/${route}/login`, function(req, res, next) {
            auth.login(req.body, Lets.try(next, function(err, resp) {
                if (err != null)
                {
                    return res.showError(err.message || err);
                }
                if (!res.locals.apiMode == true)
                {
                    req.session.auth = req.session.auth || {};
                    req.session.auth[res.locals.modelKey] = resp;
                }
                if (typeof resp.toJSON == 'function')
                {
                    resp = resp.toJSON();
                }

                res.respond({values:{}, result:resp})
            }));
        })
    }

    if (auth.logout)
    {
        router.get(`/${route}/logout`, function(req, res, next) {
            /* if (res.locals.apiMode == true)
             {
             // don't need this for api
             return next();
             } */
            if (!res.locals.apiMode == true)
            {
                req.session.auth = req.session.auth || {};
                req.session.auth[res.locals.modelKey] = req.session.auth[res.locals.modelKey] || {};
            }
            var logoutData = res.locals.apiMode ? req.query : req.session.auth[res.locals.modelKey];

            auth.logout(logoutData, Lets.try(next, function(err, result)
            {
                if (err)
                {
                    return next(err);
                }
                if (!res.locals.apiMode == true)
                {
                    var processData = buildProcess(req, res);
                    req.session.auth[res.locals.modelKey] = result;
                    res.redirect(processData.loginURL);
                }
                else
                {
                    res.respond({result:'User has been logged out'})
                }
            }));
        });
    }

    if (auth.verify && auth.verificationKey)
    {
        router.route(`/${route}/verify`)
            .get(function(req,res,next)
            {
                if (res.locals.apiMode == true)
                {
                    // don't need this for api
                    return next();
                }
                var processData = buildProcess(req, res);
                processData.view = res.locals.view;
                var obj = new Model(req.query);
                processData.obj = JSON.stringify(obj);
                req.session.auth = req.session.auth || {};
                req.session.auth[res.locals.modelKey] = req.session.auth[res.locals.modelKey] || {};
                req.session.auth[res.locals.modelKey][auth.verificationKey] = req.query[auth.verificationKey];
                var template = 'templates.admin.verify';
                if (res.locals.view.templates && res.locals.view.templates.verify)
                {
                    template = res.locals.view.templates.verify;
                }
                out(res, template, processData);
            })
            .post(function(req,res,next)
            {
                if (!res.locals.apiMode)
                {
                    req.session.auth = req.session.auth || {};
                    req.session.auth[res.locals.modelKey] || {};
                }

                var data = res.locals.apiMode ? req.body : req.session.auth[res.locals.modelKey]

                auth.verify(data, Lets.try(next, function(err, result)
                {
                    if (err != null)
                    {
                        return res.showError(err.message || err);
                    }
                    if (res.locals.apiMode != true)
                    {
                        req.session.auth = req.session.auth || {};
                        req.session.auth[res.locals.modelKey] = result;
                    }

                    res.respond({values:{}, result:result});
                }));
            });
    }

    if (auth.sendResetPasswordEmail)
    {
        router.get(`/${route}/forgot-password`, function(req, res, next)
        {
            if (res.locals.apiMode)
            {
                return next();
            }

            var processData = buildProcess(req, res);

            out(res, 'templates.admin.forgot-password', processData);
        });

        router.post(`/${route}/forgot-password`, function(req, res, next)
        {

            var baseURL = res.locals.apiMode ? Config.RB_WEB_LINK : Config.RB_ADMIN_LINK;
            var fromEmail = Config.RB_FROM_EMAIL;
            var title = `Reset your ${Config.RB_PROJECT_TITLE} password`;
            auth.sendResetPasswordEmail(req.body.email, fromEmail, baseURL, title, function(err, message)
            {
                if (err)
                {
                    return res.showError(err);
                }

                res.respond({result: message});
            })
        });

        router.get(`/${route}/reset-password`, function(req, res, next)
        {
            if (res.locals.apiMode)
            {
                return next();
            }

            var processData = buildProcess(req, res);

            var key = req.query.key;
            auth.hasValidPasswordResetToken(key, function(err, isValid)
            {
                if (err)
                {
                    return next(err);
                }

                if (!isValid)
                {
                    processData.warning = "It appears as though your password reset token has expired."
                    return out(res, "templates.admin.warning", processData);
                }

                processData.resetKey = key;

                out(res, 'templates.admin.reset-password', processData);
            });
        });

        router.post(`/${route}/reset-password`, function(req, res, next)
        {
            var key = req.body.key;
            auth.hasValidPasswordResetToken(key, function(err, isValid)
            {
                if (err)
                {
                    return res.showError(err);
                }

                if (!isValid)
                {
                    return res.showError("It appears as though your password reset token has expired.");
                }

                auth.updatePassword(req.body.key, req.body.password, function(err, message)
                {
                    if (err)
                    {
                        return res.showError(err);
                    }

                    res.respond({data: message});
                });
            });
        });

        return router;
    }
}