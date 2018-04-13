(function()
{
    var WidgetRegistry = require('./WidgetRegistry.js');
    var WidgetHelper = require('./WidgetHelper.js');
    var Debug = require('../Debug.js');
    //var root = this;
    var TemplateProcessor = function TemplateProcessor()
    {
        var self = this;

        self.templateContents = '';
        self.foundWidgets = {};
        self.userInputData = null;
        self.editMode = false;
        self.processData = {};
        self.mainScope = null;

        var currentTagId = '';
        var currentFunctionName = '';

        var before = '';
        var after = '';

        self.init = function init(_templateContents, _processData)
        {
            self.templateContents = _templateContents;
            self.processData = _processData || {};
        }

        self.setEditMode = function setEditMode(_mode)
        {
            if (_mode == true)
            {
                self.editMode = true;
            }
            else
            {
                self.editMode = false;
            }
        }

        self.process = function ddd(_scopeObject, _callback, _parentScope)
        {
            var scopeObject = null;
            var parentScope = null;

            if (_parentScope != null)
            {
                parentScope = _parentScope;
            }
            else
            {
                parentScope = _scopeObject;//WidgetRegistry.methods;
            }

            if (_scopeObject)
            {
                scopeObject = _scopeObject;
                self.mainScope = scopeObject;
                self.processData.rootScope = self.mainScope;
                scopeObject.callback = function(err, result, newProcessData){
                    if (err)
                    {
                        processFailed(err);
                    }
                    else
                    {
                        if (newProcessData != null)
                        {
                            self.processData = newProcessData;
                        }


                        if (currentTagId != '')
                        {
                            if (self.editMode == true)
                            {
                                switch (currentFunctionName)
                                {
                                    default:
                                    {

                                        result = '<div class="editDiv" id="editDiv_'+currentTagId+'" editId="'+currentTagId+'" editClass="'+currentFunctionName+'"  style="'+
                                            'border:3px double #0e90d2; overflow: hidden;"><div class="noSelect" style="margin:-3px; overflow: hidden;">'
                                            +result+
                                            '</div></div>';
                                        break;
                                    }
                                }

                            }
                        }

                        // debugger;
                        self.templateContents = before + result + after;
                        //console.log(self.functionParts, (new Date().getTime()-self.startTime.getTime()))
                        process.nextTick(asyncRead);
                    }
                };


                WidgetHelper.addGlobalMethods(_scopeObject);
            }
            else
            {
                processFailed();
                return;
            }



            function endProcess()
            {
                //testing endProcess
                //don't look in head for scripts
                var indexOfHead = self.templateContents.indexOf('</head>');
                if(indexOfHead == -1)
                {
                    return _callback(null, true);
                }
                var htmlCloseIndex = self.templateContents.indexOf('</body>');
                if(htmlCloseIndex == -1)
                {
                    return _callback(null, true);
                }

                indexOfHead += 7;
                //got the head
                var headContents = self.templateContents.substr(0, indexOfHead);
                //body contents to check
                var totalContents = self.templateContents.substr(indexOfHead);

                //get all scripts out of body ignore anything in the head
               var matches = totalContents.match(/<script(?!\sdoNotMove)\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/);

                var before = '';
                var after = '';
                var scriptList = '';
                //if (!self.processData.amphtmlPage)
              //  {
                    while (matches != null)
                    {
                        scriptList += matches[0];
                        before = totalContents.substr(0, matches.index);
                        after = totalContents.substr(matches.index + matches[0].length);
                        totalContents = before + after;
                        matches = totalContents.match(/<script(?!\sdoNotMove)\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/)
                    }

                    if (typeof self.processData.csrf != 'undefined')
                    {
                        scriptList += '<script>Server.CSRF = "'+self.processData.csrf+'";</script>';
                    }
               // }
                htmlCloseIndex = totalContents.indexOf('</body>');

                //get all contents before the close html tag
                before = totalContents.substr(0, htmlCloseIndex);

                //get contents after close html tag
                after = totalContents.substr(htmlCloseIndex);

                self.templateContents = headContents + before + scriptList + after;
                _callback(null, true);
            }

            function processFailed(err)
            {
                _callback(err, null);
            }


            function asyncRead()
            {
                self.startTime = new Date();
                //get all the occurrences of tags in the template.
                var matches = self.templateContents.match(/\{{2}#([\w\d\-]+):?([^\}]+)?\}{2}/);

                if (matches == null)
                {
                    endProcess();
                    return;
                }

                before = self.templateContents.substr(0, matches.index);
                after = self.templateContents.substr(matches.index+matches[0].length);

                //try to run the function as defined...  get the arguments...
                var args = [];
                if (typeof matches[2] != 'undefined')
                {
                    var currentArgString = matches[2];
                    var literalMatches = [];//currentArgString.match(/"/);
                    var addLiteral = false;
                    var literalIter = -1;
                    for (var i= 0, ii = currentArgString.length; i<ii; i++)
                    {
                        var currentChar = currentArgString.charAt(i);
                        var prevChar = currentArgString.charAt(i-1);
                        if (currentChar == '"')
                        {
                            if (prevChar != "\\")
                            {
                                addLiteral = !addLiteral;
                                if ((addLiteral == true))
                                {
                                    literalIter += 1;
                                    literalMatches[literalIter] = '';
                                }
                            }
                            else
                            {
                                literalMatches[literalIter] += '"';
                            }
                            continue;
                        }
                        if ((i == 0) && (addLiteral == false))
                        {
                            literalIter += 1;
                            literalMatches[literalIter] = '';
                        }
                        if (addLiteral == true)
                        {
                            literalMatches[literalIter] += currentChar;
                        }
                        else
                        {
                            if (currentChar != '/')
                            {
                                literalMatches[literalIter] += currentChar;
                            }
                            else
                            {
                                literalIter += 1;
                                literalMatches[literalIter] = '';
                            }
                        }
                    }
                    args = literalMatches;
                }

                //clean up the args...
                for (var i=args.length-1; i>=0; i--)
                {
                    if (args[i].length == 0)
                    {
                        args.splice(i, 1);
                    }
                    else if (args[i] == "null")
                    {
                        args[i] = null;
                    }
                    else
                    {
                        args[i] = args[i].replace(/\\r\\n/g, '');
                        args[i] = args[i].replace(/\\r/g, '');
                        args[i] = args[i].replace(/\\n/g, '');
                        args[i] = args[i].trim();
                    }
                }

                //make it restful so that the order does not matter.
                if (args.length % 2 != 0)
                {
                    args = []; // must have valid pairs...
                }
                else
                {
                    var pairs = {};
                    for (var i=0; i<args.length; i+=2)
                    {
                        pairs[args[i]] = args[i+1];
                    }
                    args = pairs;
                }


                var insert = '';


                var functionParts = matches[1].split('-');
                self.functionParts = functionParts;
                var functionName = functionParts[0];
                var tagId = functionParts[1];

                currentTagId = tagId || '';
                currentFunctionName = functionName || '';


                //overwrite any default values with the user input value...
               /* if (typeof self.processData.page != 'undefined')
                {
                    if (self.processData.page['templateContent'].length > 0)
                    {
                        try
                        {
                            var userInputData = JSON.parse(self.processData.page.getAttribute('templateContent'));
                            if (typeof userInputData[currentTagId] != 'undefined')
                            {
                                for (var key in userInputData[currentTagId])
                                {
                                    args[key] = userInputData[currentTagId][key];
                                }
                            }
                        }
                        catch(ex)
                        {
                            console.log(ex);
                        }
                    }
                }*/


                var useArgs = [args, self.processData, parentScope, functionName, currentTagId];

                //check the widget registry for globally available widgets first.
                //then check down to the local scope to see if there is anything available.
                if ((functionName != 'callback') && (typeof scopeObject[functionName] != 'undefined'))
                {
                    if ((self.editMode == true) && (currentTagId != ''))
                    {
                        Debug.log('PROCESSOR EDIT MODE', 'TAGID ======= '+currentTagId);
                        self.foundWidgets[tagId] = {functionName:functionName, args:args};
                    }
                    scopeObject[functionName].apply(scopeObject, useArgs);
                }
                else
                {
                    self.templateContents = before + insert + after;
                    //console.log('issue finding widget');
                    //console.log(self.functionParts, (new Date().getTime()-self.startTime.getTime()))
                    process.nextTick(asyncRead);
                }
            }

            process.nextTick(asyncRead);
        }
    };

    module.exports = TemplateProcessor;

}).call(this);
