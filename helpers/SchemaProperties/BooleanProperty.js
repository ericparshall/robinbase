var common = require('./common');

function BooleanProperty()
{
    var self = this;

    self.meta = common.extendMeta({
        'default': false,
        type: 'boolean',
        storageType: 'boolean'
    });

    common.initializeProperty(self);

    self.onSet(function(input)
    {
        if (self.meta.nullable && input === null)
        {
            return input;
        }

        if (input === "false" || input === 0)
        {
            return false;
        }

        if (input === "true" || input === 1)
        {
            return true;
        }

        if (typeof input === "boolean")
        {
            return input;
        }

        return self.meta.default;
    });
}

common.extendPrototype(BooleanProperty, {
    'default': function(defaultValue)
    {
        var self = this;

        if (typeof defaultValue !== 'boolean')
        {
            if (!self.meta.nullable || defaultValue !== null)
            {
                throw new Error("Boolean property must have true or false as a default");
            }
        }

        self.meta.default = defaultValue;

        return self;
    },

    test: function(value, object)
    {
        var self = this;

        if (this.meta.nullable && value === null)
        {
            return "";
        }

        if (typeof value !== 'boolean')
        {
            return "must be a boolean value";
        }

        return common.runTestsForProperty(self, value, object);
    }
});

module.exports = BooleanProperty;
