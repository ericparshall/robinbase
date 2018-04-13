var common = require('./common');
var _ = require('lodash');
var Debug = require('../Debug');

function VariantProperty(variantKey)
{
    var self = this;

    self.meta = common.extendMeta({
        defaultValue: null,
        variantKey: variantKey,
        whens: [],
        type: 'variant',
        storageType: 'variant'
    });

    common.initializeProperty(self);

    self.onSet(function(input, object, prop)
    {
        var discriminant = object[self.meta.variantKey];
        var whens = self.meta.whens;

        for (var i = 0; i < whens.length; i++)
        {
            if (whens[i][0](discriminant, object))
            {
                return whens[i][1].set(input, object);
            }
        }

        return self.meta.defaultValue;
    });
}

common.extendPrototype(VariantProperty, {

    when: function(condition, propDef)
    {
        var self = this;

        if (typeof condition !== 'function')
        {
            var _condition = condition;
            condition = function(value) {
                return _condition === value;
            }
        }

        self.meta.whens.push([condition, propDef]);

        return self;
    },

    otherwise: function(propDef)
    {
        var self = this;

        return self.when(function(){return true;}, propDef);
    },

    test: function(input, object)
    {
        var self = this;

        var discriminant = object[self.meta.variantKey];
        var whens = self.meta.whens;

        for (var i = 0; i < whens.length; i++)
        {
            if (whens[i][0](discriminant, object))
            {
                return whens[i][1].test(input, object);
            }
        }

        return "invalid value for " + self.meta.variantKey
    }
});

module.exports = VariantProperty;
