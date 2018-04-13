(function()
{

    var WidgetRegistry = require('./WidgetRegistry.js');
    var globalWidgets = require('./widgets.js');
    var TemplateLoader = require('./TemplateLoader.js');
    var Utils = require('./Utils.js');
    var Debug = require('../Debug.js');
    var Schema = require('../Schema.js');

    WidgetHelper = function () {};

    WidgetHelper.globalWidget = new globalWidgets();

// a helper to set values that allow a falsey insert...
    WidgetHelper.setAttribute = function setAttribute(instance, args, key, defaultValue)
    {
        instance[key] =  ((typeof args[key] != 'undefined') && (args[key] != null)) ? args[key] : defaultValue;
    };

    WidgetHelper.init = function init(classObj, _className)
    {
        classObj.className = _className;

        return classObj;
    }


//add standard methods that will be available for all widgets that opt in to use them.
    WidgetHelper.addWidgetMethods = function addWidgetMethods(classObj)
    {
        //return an object value from the current scope
        classObj.LocalAttribute = function LocalAttribute(args, processData)
        {
            if ((typeof classObj != 'undefined') && (typeof args['key'] != 'undefined'))
            {
                if (typeof classObj[args['key']] != 'undefined')
                {
                    classObj.callback(null, classObj[args['key']]);
                    return;
                }
            }
            classObj.callback(null, '');
        }

        classObj.LocalID = function LocalID(args, processData)
        {
            if (typeof classObj._id != 'undefined')
            {
                classObj.callback(null, classObj._id);
                return;
            }
            classObj.callback(null, '');
        }

    }



//add standard methods that will be available for all scopes.
    WidgetHelper.addGlobalMethods = function addGlobalMethods(classObj)
    {
        classObj.data = function data(args, processData)
        {
            function addslashesjson(str)
            {
                return (str + '').replace(/[\\"]/g, '\\$&').replace(/\u0000/g, '\\0');
            }

            function addslashes(str)
            {
                return (str + '').replace(/[\\"']/g, '\\$&').replace(/\u0000/g, '\\0');
            }

            function uneval(str)
            {
                var stringify = require('javascript-stringify');
                return stringify(str);
            }
            var bypassProcess = false;

            function postProcess(str)
            {
                bypassProcess = true;
                if (args['withSlashes'] == 1)
                {
                    str = addslashes(str);
                }
                if (args['withSlashesJSON'] == 1)
                {
                    str = addslashesjson(str);
                }
                if (args['uneval'] == 1)
                {
                    str = uneval(str);
                }
                return str;
            }

            var outChars = '%s';
            if (typeof args.str != 'undefined')
            {
                outChars = args.str;
            }

            var querySet = [];
            if (typeof args.key != 'undefined')
            {
                querySet = args.key.split('.');
            }




            function innerFind(inObj, i)
            {
                var out = '';
                //nothing more to check. Iterate over the string...
                var matches = outChars.match(/%[\d|\w|\-|\_|\.|\[\]]+/g);

                if (matches != null)
                {
                    var innerOut = outChars;
                    for (var d=0; d<matches.length; d++)
                    {
                        var useReplace = '';
                        var useMatcher = matches[d].replace('%', '');
                        if (typeof inObj[i][useMatcher] != 'undefined')
                        {
                            useReplace = postProcess(inObj[i][useMatcher]);
                        }
                        else
                        {

                            out += findProp(useMatcher.split('.'), inObj[i], 0);
                        }

                        innerOut = innerOut.replace('%'+useMatcher, useReplace);
                    }
                    out += innerOut;
                }
                else
                {
                    out = outChars;
                }
                return out;
            }

            function findProp(inSet, inObj, iter)
            {

                if (inSet[iter] == '[]')
                {
                    if (typeof inObj == 'object')
                    {
                        var out = '';

                        for (var i=0; i<inObj.length; i++)
                        {

                            if (iter >= inSet.length -1)
                            {
                                //nothing more to check. Iterate over the string...
                                out += innerFind(inObj, i);

                            }
                            else //keep going...
                            {

                                out += outChars.replace('%s', findProp(inSet, inObj[i], iter+1));
                            }
                        }
                        return out;
                    }
                }
                else
                {

                    if (typeof inObj[inSet[iter]] != 'undefined')
                    {

                        if (typeof inObj[inSet[iter]] != 'object' || (inObj[inSet[iter]] instanceof Date))
                        {

                            return inObj[inSet[iter]];
                        }
                        else
                        {
                            //var matches = outChars.match(/%[\d|\w|\-|\_|\.|\[\]]+/g);
                            if (iter + 1 >= inSet.length)
                            {
                                return innerFind(inObj, inSet[iter]);
                            }
                            else
                            {

                                return findProp(inSet, inObj[inSet[iter]], iter+1);
                            }
                        }


                    }
                    else
                    {
                        if ((Array.isArray(inObj)) && (isNaN(parseInt(inSet[iter])) == true))
                        {
                            return JSON.stringify(inObj);
                        }
                        else
                        {
                            return '';//JSON.stringify(inObj);
                        }
                    }

                }
            }

            if ((querySet[0] == 'query') || (querySet[1] == 'body') || (querySet[1] == 'params'))
            {
                Debug.warn('TEMPLATE DATA WIDGET', 'Attempt to display query information rejected.  Could cause reflection or XSS attacks if allowed.  Check your template.');
                classObj.callback(null, '');
            }
            else
            {
                var foundVal = findProp(querySet, processData, 0);

               //Debug.warn('TEMPLATE DATA WIDGET', processData);
                if (bypassProcess == true)
                {
                    classObj.callback(null, foundVal);
                }
                else
                {
                    classObj.callback(null, postProcess(foundVal));
                }
            }

        }




        if (classObj != WidgetRegistry.methods)
        {
            for (var key in WidgetRegistry.methods)
            {
                if (typeof WidgetRegistry.methods[key] == 'function')
                {

                    if ((key == 'WebsiteAttribute') || (key == 'PageAttribute'))
                    {
                        continue;
                    }
                    if (typeof classObj[key] == 'undefined')
                    {
                        classObj[key] = function (args, processData, parentScope, methodName, tagId)
                        {
                            WidgetRegistry.methods[methodName].apply(classObj, [args, processData, parentScope, methodName, tagId]);
                        }
                    }
                }
            }
        }

        for (var key in WidgetHelper.globalWidget)
        {
            if (typeof WidgetHelper.globalWidget[key] == 'function')
            {
                if ((key == 'WebsiteAttribute') || (key == 'PageAttribute'))
                {
                    continue;
                }
                if (typeof classObj[key] == 'undefined')
                {
                    classObj[key] = function (args, processData, parentScope, methodName, tagId)
                    {
                        WidgetHelper.globalWidget[methodName].apply(classObj, [args, processData, parentScope, methodName, tagId]);
                    }
                }
            }
        }

    }


    WidgetHelper.processSubTemplate = function processSubTemplate(classObj, processData, parentScope)
    {

        if (typeof classObj.template == 'undefined')
        {
            if (typeof classObj.callback != 'undefined')
            {
                classObj.callback(null, '');
            }
            else
            {
                Debug.warn('PROCESS SUB TEMPLATE', 'There is no callback. 0');
                processData.rootScope.callback(null, '');
            }
            return;
        }

        if (typeof TemplateLoader.templateData[classObj.template] == 'undefined')
        {
            //  debugger;
            if (typeof classObj.callback != 'undefined')
            {
                classObj.callback(null, '');
            }
            else if (typeof parentScope.callback != 'undefined')
            {
                Debug.warn('PROCESS SUB TEMPLATE:1', 'Could not find a template: '+classObj.template);
                parentScope.callback(null, '');
            }
            else
            {
                Debug.warn('PROCESS SUB TEMPLATE:1', 'Could not find a template: '+classObj.template);
                processData.rootScope.callback(null, '');
            }
            return;
        }
        var TemplateProcessor = require('./templateProcessor.js');

        var processor = new TemplateProcessor();
        var templateData = TemplateLoader.templateData[classObj.template];
        processor.init(templateData, processData); //load from the in memory widget templates...
        processor.process(classObj, function (err2, result)
        {

            if ((typeof parentScope == 'undefined') || (typeof parentScope.callback == 'undefined'))
            {
                if (err2 != null)
                {

                    processData.rootScope.callback(err2, null);
                    return;
                }

                processData.rootScope.callback(null, processor.templateContents);
                return;
            }
            // debugger;
            if (err2 != null)
            {
                parentScope.callback(err2, null);
                return;
            }

            parentScope.callback(null, processor.templateContents);
        }, classObj);
    }

    module.exports = WidgetHelper;

}).call(this);