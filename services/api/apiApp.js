(function(){

    var Debug = require('../../helpers/Debug.js');
    var Schema = require('../../helpers/Schema.js');
    var Config = require('../../config.js');
    var express = require('express');
    var bodyParser = require('body-parser');
    var renderFunctions = require('../../helpers/RenderFunctions.js');
    var bcrypt = require('bcrypt');
    var qs = require('qs');

    //include models...
    //var Account = Config.apiModels['accounts'];
   // var Token = Config.apiModels['tokens'];

    var ApiApp = function ApiApp(port = Config.RB_API_PORT)
    {
        var self = this;

        self.init = function(_routes)
        {
            var dbApp = express();

            dbApp.set('query parser', function(query){
                return qs.parse(query, {
                    depth: 100
                })
            })

            dbApp.use(bodyParser.urlencoded({ extended: true, limit: '50mb' })); // parse application/x-www-form-urlencoded
            dbApp.use(bodyParser.json({limit: '50mb'}));
            dbApp.use(renderFunctions);

            if (process.env.BUGSNAG_KEY) {
                const bugsnag = require('@bugsnag/js');
                const bugsnagExpress = require('@bugsnag/plugin-express')
                const bugsnagClient = bugsnag(process.env.BUGSNAG_KEY)
                bugsnagClient.use(bugsnagExpress)

                const middleware = bugsnagClient.getPlugin('express')
                dbApp.use(middleware.requestHandler)
                dbApp.use(middleware.errorHandler)
            }

            routes = _routes || [require('../../routes/adminRoutes')];

            var defaultProcessData = function defaultProcessData(req, processData)
            {
                if ((typeof processData == 'undefined') || (processData == null))
                {
                    processData = {};
                }
                processData.session = req.session;
                processData.query = req.query;
                processData.body = req.body;
                processData.params = req.params;

                return processData;
            }
            dbApp.use(function(req,res,next)
            {
                res.locals.apiMode = true;
                /* if (parseInt(req.query.verbose) == 1)
                 {
                 res.locals.verbose = 1;
                 }*/
                next();
            });
            dbApp.use(function(req,res,next)
            {
                req.defaultProcessData = function(processData)
                {
                    return defaultProcessData(req,processData)
                }
                next();
            })
            routes.forEach( function (router) {
                dbApp.use(router);
            });



            var dbServer = dbApp.listen(port, function(req, res)
            {
                Debug.log('SERVER STARTED', 'DB Server listening on ' + Config.RB_API_PORT);
            });

            return dbServer;
        }
    }

    module.exports = ApiApp;

}).call(this);
