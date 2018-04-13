var common = require('./common');

function StringProperty()
{
    var self = this;

    self.meta = common.extendMeta({
        minLength: null,
        maxLength: null,
        'default': '',
        trim: false,
        stripHtml: true,
        pattern: null,
        lowerCase: false,
        upperCase: false,
        type: 'string',
        storageType: 'string',
        invalidPatternMessage: 'does not match the required pattern'
    });

    common.initializeProperty(self);

    var stripHtml = function stripHtml(str)
    {
        if (typeof str != 'string')
        {
            return '';
        }
        while (str.search(/<[^<]+?>/) != -1)
        {
            str = str.replace(/<[^<]+?>/g, '');
        }
        str = str.replace(/[<|>]/g, '');
        return str.trim();
    }

    self.onSet(function(input)
    {
        if (self.meta.nullable && input === null)
        {
            return input;
        }

        if (typeof input !== 'string')
        {
            input = self.meta.default;
        }

        if (typeof input === 'string')
        {
            if (self.meta.stripHtml)
            {
                input = stripHtml(input);
            }

            if (self.meta.trim)
            {
                input = input.trim();
            }

            if (self.meta.lowerCase)
            {
                input = input.toLowerCase();
            }

            if (self.meta.upperCase)
            {
                input = input.toUpperCase();
            }
        }

        return input;
    });
}

common.extendPrototype(StringProperty, {
    'default': function(defaultValue)
    {
        var self = this;

        if (typeof defaultValue !== 'string')
        {
            if (!self.meta.nullable || defaultValue !== null)
            {
                throw new Error("String property must have a default that is a string");
            }
        }

        self.meta.default = defaultValue;

        return self;
    },

    minLength: function(value)
    {
        var self = this;

        if (!Number.isInteger(value))
        {
            throw new Error("String property requires a min length that is an integer");
        }

        self.meta.minLength = value;

        return self;
    },

    maxLength: function(value)
    {
        var self = this;

        if (!Number.isInteger(value))
        {
            throw new Error("String property requires a max length that is an integer");
        }

        self.meta.maxLength = value;

        return self;
    },

    trim: function(doTrim)
    {
        var self = this;

        if (arguments.length < 1)
        {
            doTrim = true;
        }

        if (typeof doTrim !== 'boolean')
        {
            throw new Error('String property\'s trim option requires a boolean argument');
        }

        self.meta.trim = doTrim;

        return self;
    },

    stripHtml: function(doStripHtml)
    {
        var self = this;

        if (arguments.length < 1)
        {
            doStripHtml = true;
        }

        if (typeof doStripHtml !== 'boolean')
        {
            throw new Error('String property\'s strip html option requires a boolean argument');
        }

        self.meta.stripHtml = doStripHtml;

        return self;
    },

    pattern: function(_regexp)
    {
        var self = this;

        if (!_regexp instanceof RegExp)
        {
            throw new Error('String property\'s pattern method expects a regular expression.')
        }

        self.meta.pattern = _regexp;

        return self;
    },

    invalidPatternMessage: function(msg)
    {
        var self = this;

        if (typeof msg !== 'string')
        {
            throw new Error("Invalid Pattern Message must be a string");
        }

        self.meta.invalidPatternMessage = msg;

        return self;
    },

    lowerCase: function(doLowerCase)
    {
        var self = this;

        if (doLowerCase == null)
        {
            doLowerCase = true;
        }

        if (typeof doLowerCase !== 'boolean')
        {
            throw new Error('String property\'s lower case option requires a boolean argument');
        }

        self.meta.lowerCase = doLowerCase;

        return self;
    },

    upperCase: function(doUpperCase)
    {
        var self = this;

        if (doUpperCase == null)
        {
            doUpperCase = true;
        }

        if (typeof doUpperCase !== 'boolean')
        {
            throw new Error('String property\'s upper case option requires a boolean argument');
        }

        self.meta.upperCase = doUpperCase;

        return self;
    },

    long: function(isLongText)
    {
        var self = this;

        if (isLongText == null)
        {
            isLongText = true;
        }

        self.meta.storageType = isLongText ? 'text' : 'string';
    },

    test: function(value, object)
    {
        var self = this;

        if (self.meta.nullable && value === null)
        {
            return "";
        }

        if (typeof value !== 'string')
        {
            return "must be a string";
        }

        if (self.meta.minLength !== null && value.length < self.meta.minLength)
        {
            return "must be at least " + self.meta.minLength + " character" + (self.meta.minLength === 1 ? '' : 's') + " long";
        }

        if (self.meta.maxLength !== null && value.length > self.meta.maxLength)
        {
            return "can not be more than " + self.meta.maxLength + " character" + (self.meta.maxLength === 1 ? '' : 's') +" long";
        }

        if (self.meta.pattern !== null && !(new RegExp(self.meta.pattern)).test(value))
        {
            return self.meta.invalidPatternMessage;
        }

        return common.runTestsForProperty(self, value, object);
    }
});

module.exports = StringProperty;
