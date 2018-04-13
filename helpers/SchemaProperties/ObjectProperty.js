var common = require('./common');
var _ = require('lodash');

function ObjectProperty()
{
    var self = this;

    self.meta = common.extendMeta({
        of: null,
        'default': {},
        minLength: null,
        maxLength: null,
        type: 'object',
        storageType: 'object'
    });

    common.initializeProperty(self);

    self.onSet(function(input, object, rawData)
    {
        if (self.meta.nullable && input === null)
        {
            return input;
        }

        if (typeof input === 'string')
        {
            try
            {
                input = JSON.parse(input);
            }
            catch (e)
            {
                input = null;
            }
        }

        if (!_.isObjectLike(input))
        {
            input = _.cloneDeep(self.meta.default);
        }

        if (_.isObjectLike(input))
        {
            if (self.meta.of !== null)
            {
                if (_.isPlainObject(self.meta.of))
                {
                    var acceptedKeys = Object.keys(self.meta.of);
                    input = _.pick(input, acceptedKeys);

                    acceptedKeys.forEach(function(key)
                    {
                        input[key] = self.meta.of[key].set(input[key], object, self);
                    });
                }
                else
                {
                    input = _.map(input, function(item, key)
                    {
                        return self.meta.of.onSet(item, object, rawData);
                    });
                }
            }
        }

        return input;
    });
}

common.extendPrototype(ObjectProperty, {
    'default': function(defaultValue)
    {
        var self = this;

        if (!_.isObjectLike(defaultValue))
        {
            if (!self.meta.nullable || defaultValue !== null)
            {
                throw new Error("Object property default must be an object");
            }
        }

        self.meta.default = defaultValue;

        return self;
    },

    of: function(ofType)
    {
        var self = this

        if (_.isPlainObject(ofType))
        {
            _.forEach(ofType, function(type)
            {
                if (typeof type.onSet !== 'function' || typeof type.test !== 'function')
                {
                    throw new Error('Object property of method expects a single property definition or a plain object of property definitions');
                }
            })
        }
        else
        {
            if (typeof ofType.onSet !== 'function' || typeof ofType.test !== 'function')
            {
                throw new Error('Object property of method expects a single property definition or a plain object of property definitions');
            }
        }


        self.meta.of = ofType;

        return self;
    },

    test: function(value, object)
    {
        var self = this;

        if (this.meta.nullable && value === null)
        {
            return "";
        }

        if (!_.isObjectLike(value))
        {
            return "must be an object";
        }

        if (self.meta.minLength !== null && _.size(value) < self.meta.minLength)
        {
            return "must contain at least " + self.meta.minLength + " items";
        }

        if (self.meta.maxLength !== null && _.size(value) > self.meta.maxLength)
        {
            return "may contain no more than " + self.meta.maxLength + " items";
        }

        if (self.meta.of != null)
        {
            if (_.isPlainObject(self.meta.of) && _.size(self.meta.of) !== _.size(value))
            {
                return "expected " + _.size(self.meta.of) + " items but got " + _.size(value) + " items";
            }
            var i, message, keys, useOf = self.meta.of;

            if (_.isPlainObject(self.meta.of))
            {
                keys = Object.keys(self.meta.of);
                for (i = 0; i < keys.length; i++)
                {
                    key = keys[i];
                    var message = self.meta.of[key].test(value[key], object);

                    if (message)
                    {
                        if (typeof message === 'string')
                        {
                            return "item with key " + key + " is not valid ( " + message + " )";
                        }

                        return message;
                    }
                }
            }
            else
            {
                keys = Object.keys(value);
                for (i = 0; i < keys.length; i++)
                {
                    key = keys[i];
                    var message = self.meta.of.test(value[key], object);

                    if (message)
                    {
                        if (typeof message === 'string')
                        {
                            return "item with key " + key + " is not valid ( " + message + " )";
                        }

                        return message;
                    }
                }
            }
        }

        return common.runTestsForProperty(self, value, object);
    }
});

module.exports = ObjectProperty;
