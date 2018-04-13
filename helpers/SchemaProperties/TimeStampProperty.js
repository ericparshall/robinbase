var common = require('./common');

function TimeStampProperty()
{
    var self = this;

    self.meta = common.extendMeta({
        minValue: null,
        maxValue: null,
        precision: 'ms',
        'default': "__auto__",
        type: 'timestamp',
        storageType: 'timestamp'
    });

    common.initializeProperty(self);

    self.onSet(function(input) {

        if (typeof input === 'string')
        {
            input = parseInt(input);
        }

        if (input instanceof Date && input.toString() !== 'Invalid Date')
        {
            input = input.getTime();
            if (self.meta.precision === 's')
            {
                input = Math.floor(input / 1000);
            }
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
            if (self.meta.default === "__auto__")
            {
                input = Date.now();
                if (self.meta.precision === 's')
                {
                    input = Math.floor(input / 1000);
                }
            }
            else
            {
                input = self.meta.default;
            }
        }

        return input;
    });

}

common.extendPrototype(TimeStampProperty, {
    'default': function(defaultValue)
    {
        var self = this;

        if (!Number.isInteger(defaultValue) && defaultValue !== '__auto__')
        {
            if (!self.meta.nullable || defaultValue !== null)
            {
                throw new Error("Timestamp property must have an integer as a default or the value \"__auto__\"");
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
            throw new Error("Timestamp property can not have a min value that is not an integer");
        }

        self.meta.minValue = value;

        return self;
    },

    maxValue: function(value)
    {
        var self = this;

        if (!Number.isInteger(value))
        {
            throw new Error("Timestamp property can not have a max value that is not an integer");
        }

        self.meta.maxValue = value;

        return self;
    },

    precision: function(value)
    {
        if (['ms', 's'].indexOf(value) === -1)
        {
            throw new Error("Timestamp precision value must be either 's' for seconds or 'ms' for milliseconds");
        }

        self.meta.precision = value;

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

module.exports = TimeStampProperty;
