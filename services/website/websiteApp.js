(function(){

    var Debug = require('../../helpers/Debug.js');
    var Schema = require('../../helpers/Schema.js');
    var Config = require('../../config.js');
    var renderFunctions = require('../../helpers/RenderFunctions.js');
    var client = require('../../helpers/communication/client.js');

    var express = require('express');
    var bodyParser = require('body-parser');
    var cookieParser = require('cookie-parser');
    var helmet = require('helmet');
    var http = require('http');
    var qs = require('qs');
    var url = require('url');

    //include models...

    var WebsiteApp = function WebsiteApp()
    {
        var self = this;

        self.port = 8080;//;
        self.routes = [];

       self.init = function(Mon, _port, _excludeTemplates, _routes, _maxAge)
       {

           self.port = _port || 8080;//;
           self.routes = _routes || [require('../../routes/websiteRoutes.js')];
           self.maxAge = _maxAge || (3600*12*1000); //12 hours

           var _ = require('lodash');


           function guid(_pattern)
           {
               var pattern = _pattern || 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'; //compliant guid pattern.

               var d = new Date().getTime();
               var uuid = pattern.replace(/[xy]/g, function(c) {
                   var r = (d + Math.random()*16)%16 | 0;
                   d = Math.floor(d/16);
                   return (c=='x' ? r : (r&0x3|0x8)).toString(16);
               });
               return uuid;
           }

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
               processData.urlInfo = url.parse(req.url);
               processData.requestId = guid('xxxxxxxx');

               return processData;
           }


           function beginFrontEnd()
           {
               Debug.log("FRONTEND", "Starting website");
               var feApp = express();

               // this needs to be set before any .use statements are run for the app.
               feApp.set('query parser', function(query){
                   return qs.parse(query, {
                       depth: 100
                   })
               })


               feApp.use(renderFunctions);

               feApp.set('trust proxy', 1);
               feApp.disable('x-powered-by');

               feApp.use(cookieParser(Config.RB_REDIS_SECRET));

               feApp.use(bodyParser.urlencoded({ extended: true })); // parse application/x-www-form-urlencoded
               feApp.use(bodyParser.json({limit:'10mb'}));
             //  feApp.use(bodyParser.raw({limit:'10mb'}));
             //  feApp.use(bodyParser.text({limit:'10mb'}));


               // security headers, can be fine tuned if needed https://www.npmjs.com/package/helmet
               feApp.use(helmet());
               feApp.use(helmet.noCache());

               feApp.use(function(req,res,next)
               {
                   req.defaultProcessData = function(processData)
                   {
                       return defaultProcessData(req,processData)
                   }
                   next();
               })


               var sessionMiddleware = require_robinbase("redis:service:middleware:redisSession")(Config, self.maxAge);

               feApp.use(function (req, res, next)
               {
                   //attempt to connect at least this many tries.
                   //This to to account for no session being available
                   var tries = 3;

                   function lookupSession(error)
                   {
                       if (error)
                       {
                           return next(error)
                       }

                       tries -= 1;

                       if (typeof req.session !== 'undefined')
                       {
                           //hurrah we found it
                           return next();
                       }
                       if (tries < 0)
                       {
                           //no session available so return error
                           res.showError('No session available. Please try again.');
                           return;
                       }
                       sessionMiddleware(req, res, lookupSession);
                   }

                   lookupSession();
               });


               for (var i=0; i<self.routes.length; i++)
               {
                   feApp.use(self.routes[i]);
               }

               const server = feApp.listen(self.port);
               Debug.log("WEBSITE STARTED", "Running at port: "+self.port);
               return server;
            }

            return beginFrontEnd();

       }
    }

    module.exports = WebsiteApp;

}).call(this);
