(function(){

    var Debug = require('../../helpers/Debug.js');

    var express = require('express');
    var WebApi = express.Router();
    var url = require('url');

    var Config = require('../../config.js');

    var bClient = require_robinbase('/helpers/communication/client.js');
    var Client = bClient.withEndpoint(Config.RB_API_LINK);

    WebApi.defProcessData = function(req)
    {
        var processData = req.defaultProcessData();

        return processData;
    }

    WebApi.get(/\/api\/(.*)$/, function (req, res) {
        var processData = WebApi.defProcessData(req);

        var urlQ = '?'+url.parse(req.originalUrl).query;

        var addToken = {};
        if (typeof req.session.token != 'undefined')
        {
            addToken = {token: req.session.token};
        }

        Client.call.get(req.params[0]+urlQ, addToken, function(err, result){
            if (err)
            {
                return res.showError(err.message, 403);
            }
            res.respond(result.data);
        });

    });

    WebApi.post(/\/api\/(.*)$/, function (req, res) {
        var processData = WebApi.defProcessData(req);

        var urlQ = '?'+(url.parse(req.originalUrl).query||"");

        if (typeof req.session.token != 'undefined')
        {
            req.body.token = req.session.token;
        }

        Client.call.post(req.params[0]+urlQ, req.body, function(err, result){
            if (err)
            {
                return res.showError(err.message, 403);
            }
            res.respond(result.data);
        });

    });

    module.exports = WebApi;

}).call(this);
