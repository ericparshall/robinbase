var common = require('./common');

function IntegerProperty()
{
    var self = this;

    self.meta = common.extendMeta({
        minValue: null,
        maxValue: null,
        'default': 0,
        type: 'integer',
        storageType: 'integer'
    });

    common.initializeProperty(self);

    self.onSet(function(input) {

        if (typeof input === 'string')
        {
            input = parseInt(input);
        }

        if (typeof input === 'number' && !Number.isInteger(input))
        {
            // force to be an integer
            input = input << 0;
        }

        if (self.meta.nullable && input === null)
        {
            return input;
        }

        if (!Number.isInteger(input))
        {
            input = self.meta.default;
        }

        return input;
    });

}

common.extendPrototype(IntegerProperty, {

    'default': function(defaultValue)
    {
        var self = this;

        if (!Number.isInteger(defaultValue))
        {
            if (!self.meta.nullable || defaultValue !== null)
            {
                throw new Error("Integer property must have an integer as a default");
            }
        }

        self.meta.default = defaultValue;

        return self;
    },

    minValue: function(value)
    {
        var self = this;

        if (!Number.isInteger(value))
        {
            throw new Error("Integer property can not have a min value that is not an integer");
        }

        self.meta.minValue = value;

        return self;
    },

    maxValue: function(value)
    {
        var self = this;

        if (!Number.isInteger(value))
        {
            throw new Error("Integer property can not have a max value that is not an integer");
        }

        self.meta.maxValue = value;

        return self;
    },

    test: function(value, object)
    {
        var self = this;

        if (self.meta.nullable && value === null)
        {
            return "";
        }

        if (!Number.isInteger(value))
        {
            return "must be an integer";
        }

        if (self.meta.minValue !== null && value < self.meta.minValue)
        {
            return "value can not be less than " + self.meta.minValue;
        }

        if (self.meta.maxValue !== null && value > self.meta.maxValue)
        {
            return "value can not be more than " + self.meta.maxValue;
        }

        return common.runTestsForProperty(self, value, object);
    }
});

module.exports = IntegerProperty;
