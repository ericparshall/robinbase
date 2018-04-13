(function(){

    var Debug = require('../../helpers/Debug.js');

    var express = require('express');
    var WebLogin = express.Router();

    var Config = require('../../config.js');

    var bClient = require_robinbase('/helpers/communication/client.js');
    var Client = bClient.withEndpoint(Config.RB_API_LINK);

    WebLogin.defProcessData = function(req)
    {
        var processData = req.defaultProcessData();

        return processData;
    }


    WebLogin.get('/logout', function (req, res) {
        delete req.session.user;
        var processData = WebLogin.defProcessData(req);

        req.session.destroy();

        res.html('templates.website.logout', processData);
    });

    WebLogin.get('/login', function (req, res) {
        var processData = WebLogin.defProcessData(req);

        if (WebLogin.checkLogin(req))
        {
            return res.redirect('/');
        }

        res.html('templates.website.login', processData);
    });

    WebLogin.post('/login', function (req, res) {
        var processData = WebLogin.defProcessData(req);

        Client.call.post('users/login', req.body, function(err, result){
            if (err){
                return res.showError(err, 403);
            }

            req.session.user = result.data.result;
            req.session.token = result.data.result.token;
            res.respond("User logged in successfully!");
        });
    });

    WebLogin.get('/register', function (req, res) {
        var processData = WebLogin.defProcessData(req);

        if (WebLogin.checkLogin(req))
        {
            return res.redirect('/');
        }

        res.html('templates.website.register', processData);
    });

    WebLogin.post('/register', function (req, res) {
        var processData = WebLogin.defProcessData(req);

        req.body.role = "Website User";
        req.body.verified = true;

        Client.call.post('users/create', req.body, function(err, result){
            if (err){
                return res.showError(err, 403);
            }
            Client.call.post('users/login', req.body, function(err, result){
                if (err){
                    return res.showError(err, 403);
                }
                Debug.log('create result', result);
                req.session.user = result.data.result;
                req.session.token = result.data.result.token;
                res.respond("User logged in successfully!");
            });
        });
    });

    WebLogin.checkLogin = function(req)
    {
        if (typeof req.session.token == 'undefined')
        {
            return false;
        }
        return true;
    }

    module.exports = WebLogin;

}).call(this);