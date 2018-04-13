var common = require('./common');

function DateTimeProperty()
{
    var self = this;

    self.meta = common.extendMeta({
        minValue: null,
        maxValue: null,
        'default': "__auto__",
        type: 'datetime',
        storageType: 'datetime'
    });

    common.initializeProperty(self);

    self.onSet(function(input) {

        if (typeof input === 'string')
        {
            if (!isNaN(input))
            {
                input = parseInt(input);
            }
            else
            {
                input = new Date(input);
            }
        }

        if (typeof input === 'number')
        {
            input = new Date(input);
        }

        if (self.meta.nullable && input == null)
        {
            return input;
        }

        if (!(input instanceof Date) || input.toString() === 'Invalid Date')
        {
            if (self.meta.default === "__auto__")
            {
                input = new Date();
            }
            else if (self.meta.nullable && self.meta.default === null)
            {
                input = null;
            }
            else
            {
                input = new Date(self.meta.default);
            }
        }

        return input;
    });

}

common.extendPrototype(DateTimeProperty, {
    'default': function(defaultValue)
    {
        var self = this;

        if (!(defaultValue instanceof Date) && defaultValue !== '__auto__')
        {
            if (!self.meta.nullable || defaultValue !== null)
            {
                throw new Error("Datetime property must have a date obect as a default or the value \"__auto__\"");
            }
        }

        self.meta.default = defaultValue;

        return self;
    },

    minValue: function(value)
    {
        var self = this;

        if (!(minValue instanceof Date))
        {
            throw new Error("Date property can not have a min value that is not Date object");
        }

        self.meta.minValue = value;

        return self;
    },

    maxValue: function(value)
    {
        var self = this;

        if (!(maxValue instanceof Date))
        {
            throw new Error("Date property can not have a max value that is not a Date object");
        }

        self.meta.maxValue = value;

        return self;
    },

    test: function(value, object)
    {
        var self = this;

        if (self.meta.nullable && value == null)
        {
            return "";
        }

        if (!(value instanceof Date) || Date.toString() === 'Invalid Date')
        {
            return "must be a valid date";
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
    },

    isEqual(left, right)
    {
        left = this.set(left);
        right = this.set(right);

        const leftTime = left.getTime();
        const rightTime = right.getTime();

        return leftTime === rightTime || (Number.isNaN(leftTime) && Number.isNaN(rightTime));
    },
});

module.exports = DateTimeProperty;
