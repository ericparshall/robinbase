var common = require('./common');
var _ = require('lodash');

function ArrayProperty()
{
    var self = this;

    self.meta = common.extendMeta({
        of: null,
        'default': [],
        unique: false,
        minLength: null,
        maxLength: null,
        type: 'array',
        storageType: 'array'
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

        if (!Array.isArray(input))
        {
            input = _.cloneDeep(self.meta.default);
        }

        if (Array.isArray(input))
        {
            if (self.meta.unique)
            {
                input = input.reduce(function(result, item)
                {
                    // TODO: this does not work for object ids
                    if (result.indexOf(item) === -1)
                    {
                        result.push(item);
                    }

                    return result;
                }, []);
            }

            if (self.meta.of !== null)
            {
                if (Array.isArray(self.meta.of))
                {
                    input = self.meta.of.map(function(useOf, index)
                    {
                        return useOf.set(input[index], object, rawData);
                    });

                    // truncate the array since we really don't know
                    // what is in there or what is expected
                    input = input.slice(0, self.meta.of.length);
                }
                else
                {
                    input = input.map(function(item, index){
                        return self.meta.of.set(item, object, rawData);
                    });
                }
            }
        }

        return input;
    });
}

common.extendPrototype(ArrayProperty, {
    'default': function(defaultValue)
    {
        var self = this;

        if (!Array.isArray(defaultValue))
        {
            if (!self.meta.nullable || defaultValue !== null)
            {
                throw new Error("Array property default must be an array");
            }
        }

        self.meta.default = defaultValue;

        return self;
    },

    unique: function(isUnique)
    {
        var self = this;

        if (isUnique == null)
        {
            isUnique = true;
        }

        if (typeof isUnique !== 'boolean')
        {
            throw new Error("Array unique option requires an argument that is a boolean");
        }

        self.meta.unique = isUnique;

        return self;
    },

    minLength: function(value)
    {
        var self = this;

        if (!Number.isInteger(value))
        {
            throw new Error("Array property requires a min length that is an integer");
        }

        self.meta.minLength = value;

        return self;
    },

    maxLength: function(value)
    {
        var self = this;

        if (!Number.isInteger(value))
        {
            throw new Error("Array property requires a max length that is an integer");
        }

        self.meta.maxLength = value;

        return self;
    },

    of: function(ofType)
    {
        var self = this;

        if (Array.isArray(ofType))
        {
            ofType.forEach(function(type)
            {
                if (typeof type.set !== 'function' || typeof type.test !== 'function')
                {
                    throw new Error('Array property of method expects a single property definition or an array of property definitions');
                }
            })
        }
        else
        {
            if (typeof ofType.set !== 'function' || typeof ofType.test !== 'function')
            {
                throw new Error('Array property of method expects a single property definition or an array of property definitions');
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

        if (!Array.isArray(value))
        {
            return "must be an array";
        }

        if (self.meta.minLength !== null && value.length < self.meta.minLength)
        {
            return "must contain at least " + self.meta.minLength + " items";
        }

        if (self.meta.maxLength !== null && value.length > self.meta.maxLength)
        {
            return "may contain no more than " + self.meta.maxLength + " items";
        }

        if (self.meta.of != null)
        {
            if (Array.isArray(self.meta.of) && self.meta.of.length !== value.length)
            {
                return "expected " + self.meta.of.length + " items but got " + value.length + " items";
            }
            var i, message, useOf, of = self.meta.of;
            for (i = 0; i < value.length; i++)
            {
                if (Array.isArray(of))
                {
                    useOf = of[i];
                }
                else
                {
                    useOf = of;
                }
                var message = useOf.test(value[i], object);
                if (message)
                {
                    if (typeof message === 'string')
                    {
                        return "item at index " + i + " is not valid ( " + message + " )";
                    }

                    return message;
                };
            }
        }

        return common.runTestsForProperty(self, value, object);
    }
});

module.exports = ArrayProperty;
