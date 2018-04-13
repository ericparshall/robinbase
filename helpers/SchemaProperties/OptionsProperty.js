var common = require('./common');

function OptionsProperty(choices)
{
    var self = this;

    if (!Array.isArray(choices) || choices.length < 1) {
        throw new Error("Option property must be created with a non-empty array of choices");
    }

    self.meta = common.extendMeta({
        choices: choices,
        'default': choices[0],
        type: 'options',
        storageType: 'options'
    });

    common.initializeProperty(self);

    self.onSet(function(input)
    {
        if (self.meta.nullable && input === null)
        {
            return input;
        }

        if (self.meta.choices.indexOf(input) === -1)
        {
            return self.meta.default;
        }

        return input;
    });
}

common.extendPrototype(OptionsProperty, {
    'default': function(defaultValue)
    {
        var self = this;

        if (self.meta.choices.indexOf(defaultValue) === -1)
        {
            if (!self.meta.nullable || defaultValue !== null)
            {
                throw new Error("Options property's default value must be within the valid set of choices");
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

        if (this.meta.choices.indexOf(value) === -1)
        {
            return "value is not within the valid set";
        }

        return common.runTestsForProperty(self, value, object);
    }
});

module.exports = OptionsProperty;
