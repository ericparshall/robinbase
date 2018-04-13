var common = require('./common');

function LocationProperty()
{
    var self = this;

    self.meta = common.extendMeta({
        'default': null,
        type: 'location',
        storageType: 'location',
    });

    common.initializeProperty(self);

    self.onSet(function(input)
    {
        if (self.meta.nullable && input === null)
        {
            return input;
        }

        if (!Array.isArray(input))
        {
            if (typeof input === "object" && input.lat && input.long)
            {
                input = [input.long, input.lat];
            }
            else
            {
                return self.meta.default;
            }
        }

        if (input.length != 2)
        {
            return self.meta.default;
        }

        return input;
    });
}

common.extendPrototype(LocationProperty, {
    test: function(value, object)
    {
        var self = this;

        if (self.meta.nullable && value === null)
        {
            return '';
        }

        if (!Array.isArray(value))
        {
            console.log('value', value);
            return "Location property must be an array.";
        }

        if ((value !== null) && (value.length != 2))
        {
            return "The array must have 2 keys.";
        }

        for (var i=0; i<value.length; i++)
        {
            if (typeof value[i] !== 'number' || !isFinite(value[i]))
            {
                return "Each value in the location array must be a number";
            }
        }

        return common.runTestsForProperty(self, value, object);
    }
});

module.exports = LocationProperty;
