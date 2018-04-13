var common = require('./common');

function FloatProperty()
{
    var self = this;

    self.meta = common.extendMeta({
        minValue: null,
        maxValue: null,
        roundTo: null,
        'default': 0,
        type: 'float',
        storageType: 'float',
    });

    common.initializeProperty(self);

    self.onSet(function(input)
    {
        if (self.meta.nullable && input === null)
        {
            return input;
        }

        if (typeof input === 'string' && !isNaN(input))
        {
            input = parseFloat(input);
        }

        if (typeof input !== 'number')
        {
            input = self.meta.default;
        }

        if (typeof input === 'number' && self.meta.roundTo != null)
        {
            const places = self.meta.roundTo;
            var multiplier = Math.pow(10, places);
            return Math.round(input * multiplier) / multiplier;
        }

        return input;
    });
}

common.extendPrototype(FloatProperty, {
    'default': function(defaultValue)
    {
        var self = this;

        if (typeof defaultValue !== 'number')
        {
            if (!self.meta.nullable || defaultValue !== null)
            {
                throw new Error("Number property must have a default that is a number");
            }
        }

        self.meta.default = defaultValue;

        return self;
    },
    minValue: function(value)
    {
        var self = this;

        if (typeof value !== 'number' || !isFinite(value))
        {
            throw new Error("Float property can not have a min value that is not a number or not finite");
        }

        self.meta.minValue = value;

        return self;
    },

    maxValue: function(value)
    {
        var self = this;

        if (typeof value !== 'number' || !isFinite(value))
        {
            throw new Error("Float property can not have a max value that is not a number or not finite");
        }

        self.meta.maxValue = value;

        return self;
    },

    roundTo: function(doRoundTo)
    {
        var self = this;

        if (!Number.isInteger(doRoundTo))
        {
            throw new Error('Float property roundTo method requires an integer');
        }

        self.meta.roundTo = doRoundTo;

        return self;
    },

    test: function(value, object)
    {
        var self = this;

        if (self.meta.nullable && value === null)
        {
            return "";
        }

        if (typeof value !== 'number' || !isFinite(value))
        {
            return "must be a number";
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

module.exports = FloatProperty;
