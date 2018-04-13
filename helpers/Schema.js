var bcrypt = require('bcrypt');
var _ = require('lodash');

var Properties = require('./SchemaProperties');

var Debug = require('./Debug.js').prefix('Schema');

var Schema = function(useId, props)
{
    var self = this;

    self.useId = useId;
    self.props = props;
}

Schema._hidekeys = Symbol("hidekeys");
Schema._originaldata = Symbol("originaldata");
Schema._authorization = Symbol('authorization');
Schema.getOriginalDataForInstance = function(instance)
{
    return instance[Schema._originaldata];
}

Schema.inspectFullInstance = function(instance)
{
    return inspectModel(instance.constructor.name, instance);
}

function inspectModel(className, data)
{
    var objString = Object.keys(data).map(function(key){
        var dataString = "";
        try {
            dataString = JSON.stringify(data[key]);
        } catch (e) {
            dataString = "[stringify failed]"
        }
        return "    " + key + ": " + dataString
    }).join('\n');

    return className + " {" + objString + " }";
}

function jsonifyModel(data, hidden)
{
    var result = {};

    Object.keys(data).forEach(function(key) {
        var value = data[key];
        if (!hidden.has(key) && (typeof value !== 'function')) {
            result[key] = value;
        }
    });

    return result;
}

Schema._propertyTypes = {};

Schema.registerPropertyType = function registerPropertyType(key, fn, type)
{
    if (typeof Schema[key] !== "undefined")
    {
        Debug.warn("Duplicate property type declared: ", key);
        return;
    }

    const defPropName = fn.length === 0 ? 'get' : 'value';

    Object.defineProperty(Schema, key, {
        [defPropName]: fn,
        configurable: false
    });

    if (type !== null)
    {
        Schema._propertyTypes[key] = type;
    }
}

Schema.prototype.initializeInstance = function initializeInstance(instance, data)
{
    var self = this;

    var keys = Object.keys(self.props);

    var __data = {}
    var __changed = new Set();
    var __initializing = true;

    keys.forEach(function(key) {
        Object.defineProperty(instance, key, {
            get: function() {
                return __data[key];
            },
            set: function(value) {
                // this === instance
                const useValue = self.props[key].set(value, this);
                if ((!__initializing && !self.props[key].isEqual(__data[key], useValue)) || (typeof value === 'undefined'))
                {
                    __changed.add(key);
                }
                __data[key] = useValue;
            },
            enumerable: true,
            configurable: false
        });

        instance[key] = data[key];
    });

    __initializing = false;

    instance[Schema._originaldata] = _.cloneDeep(__data);

    if (typeof instance.constructor.joins  != 'undefined')
    {
        var joinKeys = Object.keys(instance.constructor.joins);

        var Config = require('../config.js');
        joinKeys.forEach(function(key){
            if (!data[key] || instance.constructor.joins[key].raw)
            {
                return;
            }
            if (!Array.isArray(data[key]))
            {
                data[key] = [data[key]];
            }
            var outObj = [];
            for (var i =0; i<data[key].length; i++)
            {
                if (!data[key][i])
                {
                    continue;
                }
                var useModel = instance.constructor.joins[key].model || instance.constructor.joins[key].collection;
                var joinObj = new Config.allModels[useModel](data[key][i]);

                // this needs to remain as a model instance for authorization purposes
                for (var jKey in joinObj)
                {
                    if (typeof data[key][i][jKey] === 'undefined')
                    {
                        joinObj[Schema._hidekeys].add(jKey);
                    }
                }

                outObj[i] = joinObj;
            }
            instance[key] = outObj;
        });
    }

    // this enables pretty logging of the object
    if (typeof instance.inspect === 'undefined')
    {
        Object.defineProperty(instance, "inspect", {
            value: function(){
                return inspectModel(instance.constructor.name, instance.toJSON());
            },
            configurable: false,
            enumerable: false,
            writable: false
        });
    }

    if (typeof instance.toJSON === 'undefined')
    {
        Object.defineProperty(instance, 'toJSON', {
            value: function() {
                var hidden = instance[Schema._hidekeys];
                return jsonifyModel(instance, hidden);
            },
            configurable: false,
            enumerable: false,
            writable: false
        });
    }

    Object.defineProperty(instance, 'getChangedValues', {
        value: function() {
            var res = {};
            for (var i of __changed) {
                res[i] = this[i];
            }
            return res;
        },
        configurable: false,
        enumerable: false
    });

    Object.defineProperty(instance, '_getData', {
        value: function() {
            return Object.assign({}, __data);
        },
        configurable: false,
        enumerable: false
    });

    instance[Schema._authorization] = null;

    if (data instanceof instance.constructor)
    {
        // Dont lose the security data if we accidentally remake the instance
        // from another instance
        instance[Schema._hidekeys] = new Set(data[Schema._hidekeys]);
        instance[Schema._authorization] = data[Schema._authorization];
    }
    else
    {
        instance[Schema._hidekeys] = new Set(instance.constructor.view.hidden || []);
    }

    return instance;
}

Schema.prototype.prepareId = function(idValue) {
    const self = this;
    const prop = self.props[self.useId];
    const preparedValue = prop.set(idValue);
    return prop.test(preparedValue) ? null : preparedValue;
}

Schema.prototype.generateId = function() {
    const self = this;
    const prop = self.props[self.useId];
    const preparedValue = prop.generate();
    return preparedValue;
}

Schema.prototype.prepareInstance = function prepareInstance(instance)
{
    var self = this;

    var keys = Object.keys(self.props);

    keys.forEach(function(key) {
        try {
            var failure = self.props[key].test(instance[key], instance)
        } catch (e) {
            Debug.log('Error thrown for key ' + key, e);
            throw e;
        }

        if (failure)
        {
            // is this the correct behavior ????
            if (key === self.useId)
            {
                delete instance[key];
                return;
            }

            if (typeof failure === 'string')
            {
                failure = new Error("Invalid value for " + key + ": " + failure);
            }

            throw failure;
        }
    });
}

Schema.utils = {};
Schema.utils.stripHtml = function stripHtml(str)
{
    if (typeof str != 'string')
    {
        return '';
    }
    while (str.search(/<[^<]+?>/) != -1)
    {
        str = str.replace(/<[^<]+?>/g, '');
    }
    str = str.replace(/[<|>]/g, '');
    return str.trim();
}
Schema.utils.trim = function trim(str)
{
    return str.trim();
}
Schema.utils.round = function round(num, places)
{
    var multiplier = Math.pow(10, places);
    return Math.round(num * multiplier) / multiplier;
}
Schema.utils.hashPassword = function(pass, callback, validations, _errMessage)
{
    if (!Array.isArray( validations ) )
    {
        validations = [
            /[A-Z]/,
            /\d/,
            /\W/,
            /[a-z]/
        ]
    }

    if (!pass || typeof pass !== 'string')
    {
        return callback("Password was empty.", false);
    }

    for (var i = 0; i < validations.length; i++)
    {
        if (pass.search(validations[i]) == -1)
        {
            // TODO: this string needs to be passed in
            // since a different validation set might be used
            var errMessage = _errMessage ||
                'Password must contain at least one uppercase and one lower case letter, at least one symbol and at least one number.';
            return callback(errMessage, false);
        }
    }

    bcrypt.genSalt(10, function(err, genSalt){
        if (err)
        {
            return callback(err, false);
        }
        bcrypt.hash(pass, genSalt, callback);
    });
}

Schema.utils.randomId = function (length) {
    length = length || 16;
    var allowed = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890";

    var string = "";

    for (var i = 0; i < length; i++) {
        string += allowed[Math.floor(Math.random() * allowed.length)];
    }

    return string;
}

Schema.regexps = {};
Schema.regexps.email = /^((([a-z]|\d|[!#\$%&'\*\+\-\/=\?\^_`{\|}~]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])+(\.([a-z]|\d|[!#\$%&'\*\+\-\/=\?\^_`{\|}~]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])+)*)|((\x22)((((\x20|\x09)*(\x0d\x0a))?(\x20|\x09)+)?(([\x01-\x08\x0b\x0c\x0e-\x1f\x7f]|\x21|[\x23-\x5b]|[\x5d-\x7e]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(\\([\x01-\x09\x0b\x0c\x0d-\x7f]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF]))))*(((\x20|\x09)*(\x0d\x0a))?(\x20|\x09)+)?(\x22)))@((([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.)+(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.?$/i;

Schema.presets = require('./SchemaProperties/presets.js');

module.exports = Schema;
