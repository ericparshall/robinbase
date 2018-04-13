(function(){

    const exeunt = require('exeunt');

    var debugLevel = 1;
    var debugPatterns = null;

    var Debug = function Debug(prefix)
    {
        var self = this;
        var logMethod = 'log';
        var defaultLogMethod = 'log';

        var errorColor = '\x1b[31m'; //red
        var warnColor = '\x1b[33m'; //blue
        var defaultColor = '\x1b[34m'; //blue
        var debugColor = '\x1b[35m'; // purple
        var criticalColor = '\x1b[41m\x1b[1;97m'; //blue
        var deprecateColor = '\x1b[33m' // brown / yellow
        var currentColor = defaultColor;

        var currentDebugLevel = 1;

        var debugLabel = 'DEBUG';
        var defaultLabel = 'INFO';
        var errorLabel = 'PROBLEM';
        var criticalLabel = 'CRASH!!!';
        var warnLabel = 'WARNING';
        var deprecateLabel = "DEPRECATED";
        var currentLabel = defaultLabel;
        var errorDetails = '';
        prefix = prefix || prefix;

        var logger = console;

        if (process.env.RB_DEBUG_USE_PROCESS_LOGGER == 1)
        {
            var ProcessLogger = require('./ProcessLogger');
            logger = new ProcessLogger();
        }

        var setDefaults = function setDefaults()
        {
            currentLabel = defaultLabel;
            currentColor = defaultColor;
            logMethod = defaultLogMethod;
            currentDebugLevel = 1;
            errorDetails = '';
        }

        self.warn = function _warn()
        {
            function getErrorObject(){
                try { throw Error('') } catch(err) { return err; }
            }
            var err = getErrorObject();
            errorDetails = err.stack;

            var lines = errorDetails.split('\n');
            lines.splice(0,4);
            errorDetails = '\n'+lines.join('\n');

            logMethod = 'log';
            currentLabel = warnLabel;
            currentColor = warnColor;
            currentDebugLevel = self.LOG_LEVELS.WARN;
            self.log.apply(self, arguments);
            setDefaults();
            //console.trace();
        }

        self.error = function _error()
        {
            function getErrorObject(){
                try { throw Error('') } catch(err) { return err; }
            }
            var err = null;
            if (arguments[1] instanceof Error)
            {
                err = arguments[1];
                errorDetails = err.stack;
            }
            else
            {
                err = getErrorObject();
                errorDetails = err.stack;

                var lines = errorDetails.split('\n');
                lines.splice(0,4);
                errorDetails = '\n'+lines.join('\n');
            }


           //logMethod = 'error';
            currentLabel = errorLabel;
            currentColor = errorColor;
            currentDebugLevel = self.LOG_LEVELS.ERROR;
            self.log.apply(self, arguments);
            setDefaults();
            //console.trace();
        }

        self.critical = function _critical()
        {
            function getErrorObject(){
                try { throw Error('') } catch(err) { return err; }
            }
            var err;
            var lengthKey = arguments.length - 1;

            if (arguments[lengthKey] instanceof Error)
            {
                err = arguments[lengthKey];
                errorDetails = err.stack;
            }
            else
            {
                err = getErrorObject();
                errorDetails = err.stack;

                var lines = errorDetails.split('\n');
                lines.splice(0,4);
                errorDetails = '\n'+lines.join('\n');
            }


           /* var lines = errorDetails.split('\n');
            //lines.splice(0,4);
            errorDetails = '\n'+lines.join('\n');*/

            //logMethod = 'error';
            currentLabel = criticalLabel;
            currentColor = criticalColor;
            currentDebugLevel = self.LOG_LEVELS.CRITICAL;
            self.log.apply(self, arguments);
            setDefaults();
            //console.trace();
        }

        self.log = function _log()
        {
            var args = arguments;
            if (prefix)
            {
                args = [prefix].concat(Array.from(args));
            }

            var doLog = currentDebugLevel >= debugLevel;
            if (!doLog && debugPatterns && typeof args[0] === "string")
            {
                doLog = debugPatterns.reduce(function(result, pattern)
                {
                    return result || (new RegExp(pattern, 'i')).test(args[0]);
                }, false);
            }

            if (doLog)
            {
                if (typeof args[0] == 'string')
                {
                    var useReturn = '\n\t↳ ';

                    var useLabel = args[0];
                    if (useLabel.search(/\n/) == -1)
                    {
                        useReturn = '--> ';
                    }

                    if (typeof args[1] != 'undefined')
                    {
                        if (typeof args[1] != 'string')
                        {
                            useReturn = '\n\t↳ ';
                            useLabel = useLabel + '\n\n';
                        }
                        useLabel = "\x1b[0m"+args[0].toUpperCase();
                    }
                    else
                    {
                        useLabel = "\x1b[0m"+args[0];
                    }



                    args[0] = currentColor+currentLabel+" [" + new Date().toString() +"] "+errorDetails +useReturn+ useLabel;
                }
                logger[logMethod].apply(logger, args);
            }
        }

        self.info = self.log;

        self.debug = function _debug()
        {
            currentLabel = debugLabel;
            currentColor = debugColor;
            currentDebugLevel = self.LOG_LEVELS.DEBUG;
            self.log.apply(self, arguments);
            setDefaults();
        }

        self.deprecate = function _deprecate()
        {
            currentLabel = deprecateLabel;
            currentColor = deprecateColor;
            currentDebugLevel = self.LOG_LEVELS.WARN;
            self.log.apply(self, arguments);
            setDefaults();
        }

        self.testLog = function _testLog(title, message, passed)
        {
            var labelColor = '\x1b[31m';
            if (passed == true)
            {
                labelColor = '\x1b[0;32m';
            }
            logger.log(labelColor+title, message+'\x1b[30m');//.apply(console, arguments);
        }

        self.handleCritical = function handleCritical(callback)
        {
            function exitHandler(options, err)
            {
                if (err)
                {
                    self.critical("Critical Error.  Process Stopping.", err);
                    callback(err);
                }
                if (options.exit)
                {
                   process.stderr.write(err.stack, function(){
                       exeunt(1);
                   });
                }
            }

            //catches uncaught exceptions
            process.on('uncaughtException', exitHandler.bind(null, {exit:true}));
            return self;
        }

        self.testIter = 0;
        self.testPassed = true;
        self.testQueue = [];
        self.endQueueFunc;
        self.test = function test(description, _testFunc) {
            self.testQueue.push(description);
           // self.log('TESTING Q:', self.testQueue);
        };

        var testPart = function testPart(description, _testFunc) {
            var testSelf = this;
            var testFunc = _testFunc;
            testFunc = function ()
            {
                // arguments[0] = description;
                var res = Object.getPrototypeOf(_testFunc).apply.apply(_testFunc, arguments);
                self.log('RUNNING Test: '+description, '=>');
            }
            testFunc(testSelf);
        };

        self.test.begin = function begin(_endFunc)
        {
            self.testPassed = true;
            self.testIter = 0;
            self.endQueueFunc = _endFunc;
            logger.log(self.testQueue[self.testIter]);
            testPart(self.testQueue[self.testIter][0],  self.testQueue[self.testIter][1]);
        }

        self.assert = function assert()
        {
            for (var i=0; i<arguments.length; i+=2)
            {
                var condition = arguments[i+1];
                if (condition != true)
                {
                    self.testPassed = false;
                    self.testLog('\t\t☓', arguments[i], false);
                    return;
                }
                self.testLog('\t\t✔', arguments[i], true);
            }

        }

        self.next = function next(_skip)
        {
            var skip = _skip || 0;
            self.testIter += 1+skip;
            if (typeof self.testQueue[self.testIter] == 'undefined')
            {
                if (self.testPassed == true)
                {
                    self.log('TEST COMPLETED', 'ALL TESTS PASSED!');
                }
                else
                {
                    self.error('TEST COMPLETED', 'FAILED!');
                }
                if (typeof self.endQueueFunc == 'function')
                {
                    self.endQueueFunc(self.testPassed);
                }
                return;
            }
            testPart(self.testQueue[self.testIter][0],  self.testQueue[self.testIter][1]);
        }

        self.prefix = function(_prefix)
        {
            if (prefix)
            {
                _prefix = prefix + ':' + prefix;
            }

            return new Debug(_prefix);
        }

        self.setGlobalDebugLevel = function(value)
        {
            if (typeof value === 'string')
            {
                value = self.LOG_LEVELS[value];
            }

            if (!Number.isInteger(value) || value < this.LOG_LEVELS.DEBUG || value > this.LOG_LEVELS.NONE)
            {
                self.warn("Invalid value given for Debug.setGlobalDebugLevel");
                return;
            }

            debugLevel = value;
        }

        self.setGlobalDebugPattern = function(pattern)
        {
            debugPatterns = pattern.split(',').map(function(p)
            {
                const str = Array.from(p).map(function(c)
                {
                    if (c === "*")
                    {
                        return ".+"
                    }

                    return c;
                }).join('');

                return `^${str}$`;
            });

            logger.log('Debug pattern set to: ', debugPatterns);
        }
    };

    Debug.prototype.LOG_LEVELS = {
        DEBUG: 0,
        INFO: 1,
        WARN: 2,
        ERROR: 3,
        NONE: 4,
        CRITICAL: 5,
    }

    module.exports = new Debug();
}).call(this);
