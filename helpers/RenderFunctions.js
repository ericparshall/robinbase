/**
 * Created by dc on 3/31/15.
 */
(function(){

    var Debug = require('./Debug.js');
    var TemplateLoader = require('./processor/TemplateLoader.js');
    var TemplateProcessor = require('./processor/templateProcessor.js');
    var WidgetRegistry = require('./processor/WidgetRegistry.js');
    var _ = require('lodash');

    var renderFunctions = function renderFunctions(_req, _res, _next)
    {
        var req = _req;
        var res = _res;
        var next = _next;

        res.showError = function showError(message, _code, _content)
        {
            var code = _code || 400;
            var content = _content || {};
            var header =  {'Content-Type': 'text/plain; charset=utf-8'};
            var dataIns = content;
            if (_content instanceof Error)
            {
                dataIns = _content.message;
            }
            var errResult = {"code": code, message: message, data:dataIns};
            Debug.error('SERVER STILL RUNNING... '+message, content);
           // res.respond(code, {'Content-Type': 'text/plain; charset=utf-8'}, JSON.stringify(errResult, null, '\t'));
            var sendResult = JSON.stringify(errResult, null, '\t');
            if(!res.headersSent)
            {
                res.writeHead(code, header);
            }
            res.end(sendResult);
        }

        res.respond = function respond(content, _code, _header)
        {
            var code = _code || 200;
            var header = _header || {'Content-Type': 'text/plain; charset=utf-8'};

            var sendResult = {"code": code, message: "Success", data: content};

            sendResult = JSON.stringify(sendResult, null, '\t');

            if(!res.headersSent)
            {
                res.writeHead(code, header);
            }
            res.end(sendResult);
        };

        res.respondClean = function respondClean(content, _code, _header)
        {
            var code = _code || 200;
            var header = _header || {'Content-Type': 'text/plain; charset=utf-8'};


            sendResult = JSON.stringify(content, null, '\t');

            if(!res.headersSent)
            {
                res.writeHead(code, header);
            }
            res.end(sendResult);
        };

        res.respondRaw = function respondRaw(content, _code, _header)
        {
            var code = _code || 200;
            var header = _header || {'Content-Type': 'text/plain; charset=utf-8'};


            sendResult = content;

            if(!res.headersSent)
            {
                res.writeHead(code, header);
            }
            res.end(sendResult);
        }

        res.pageResponse = function pageResponse(content, code, header)
        {

            if(typeof content != 'string')
            {
                content = JSON.stringify(content);
            }

            if(!res.headersSent)
            {
                res.writeHead(code, header);
            }
            res.end(content);
        };

        res.html = function html(templateVar, processData)
        {
            // reset csrf token
            //processData.csrf = req.csrfToken();


            if (typeof TemplateLoader.templateData[templateVar] == 'undefined')
            {
                res.showError('Could not find the template, ' + templateVar);
                return;
            }

            res.cleanViewData(processData);


            var processor = new TemplateProcessor();

            processor.init(TemplateLoader.templateData[templateVar], processData);
            processor.process(_.cloneDeep(WidgetRegistry.methods), function root(err2, result)
            {
                if (err2 != null)
                {
                    res.showError('there was an issue processing the template: ' + err2);
                    return;
                }
                var useType = 'text/html; charset=utf-8';
                if (typeof processData.contentType != 'undefined')
                {
                    useType = processData.contentType + "; charset=utf-8";
                }

                res.pageResponse(processor.templateContents, 200, {'Content-Type': useType});

            });
        }

        res.redirect = function(_path, _status)
        {
            var path = _path || '/';
            var status = _status || 302;


            res.writeHead(status, {
                'Location': path,
                'Cache-Control': 'max-age=600'
            });
            res.end();
            //cache 301 redirects
        }

        res.cleanViewData = function(processData)
        {
            if (!processData || !processData.view || Object.keys(processData.view).length == 0)
            {
                return;
            }

            var viewData = processData.view;
            var newView = _.cloneDeep(viewData);


            var _attributes = {};
            var context = processData.context;
            var denyViewKeys = [];
            var denyAlterKeys = [];
            var authData = res.locals.authorization ? res.locals.authorization.data : {};
            const viewAttributes = viewData.getAttributesForContext(context, processData.dataSource, authData);
            var attributeKeys = Object.keys(viewAttributes);

            if (res.locals.authorization && !processData.isLogin)
            {
                if (context === "edit")
                {
                    denyAlterKeys = res.locals.authorization.getDeniedKeys(attributeKeys, "update", processData.dataSource)
                }
                else if (context === "create")
                {
                    var createSetter = res.locals.authorization.getCreateDefaultValues();
                    var obj = JSON.parse(processData.obj || '{}');
                    for (var key in createSetter)
                    {
                        obj[key] = createSetter[key];
                        processData.dataSource[key] = createSetter[key];
                    }

                    processData.obj = JSON.stringify(obj);

                    denyAlterKeys = res.locals.authorization.getDeniedKeys(attributeKeys, "create", processData.dataSource)
                }

                denyViewKeys = res.locals.authorization.getDeniedKeys(attributeKeys, "view", processData.dataSource);
            }

            attributeKeys.forEach(function(key)
            {
                var attribute = viewAttributes[key];
                if (denyViewKeys.indexOf(key) > -1)
                {
                    // nothing
                }
                else if (Array.isArray(attribute.omitContexts) && attribute.omitContexts.indexOf(context) > -1)
                {
                    // nothing
                }
                else if (denyAlterKeys.indexOf(key) > -1)
                {
                    // immutable
                    attribute = _.cloneDeep(attribute);
                    // immutable does not work for create
                    attribute.immutable = true;
                    _attributes[key] = attribute;
                }
                else
                {
                    _attributes[key] = attribute;
                }
            });



            newView._attributes = _attributes;
            newView.layout = null;
            if (viewData.formLayouts)
            {
                newView.layout = viewData.formLayouts[context] || null;
            }
            // Debug.log("New view: ", JSON.stringify(newView, null, "    "));
            processData.view = JSON.stringify(newView);
            processData.viewObj = newView;
        }

        next();
    }

    module.exports = renderFunctions;
}).call(this)
