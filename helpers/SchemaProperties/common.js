var common = module.exports;
var isEqual = require('is-equal');

common.initializeProperty = function(self) {
    self._checks = [];
    self._preps = [];
    self.meta.indexes = [];
}

common.extendMeta = function(extra) {
    var meta = {
        nullable: false,
        references: null,
    }

    for (var key in extra) {
        meta[key] = extra[key];
    }

    return meta;
}

common.extendPrototype = function(Prop, methods)
{
    Prop.prototype = Object.create(defaultPrototype);

    for (var key in methods) {
        Prop.prototype[key] = methods[key];
    }
}

var defaultPrototype = {
    nullable: function(isNullable)
    {
        var self = this;

        if (arguments.length === 0)
        {
            isNullable = true;
        }

        if (typeof isNullable !== 'boolean')
        {
            throw new Error("Nullable only accepts true or false as a parameter.");
        }

        if (isNullable === false && self.meta.default === null)
        {
            throw new Error("Can not make a property not nullable if its default is null.");
        }

        self.meta.nullable = isNullable;

        return self;
    },

    failOnSave: function(message, condition)
    {
        var self = this;

        self._checks.push([message, condition]);

        return self;
    },

    check: function check(condition, message)
    {
        var self = this;
        return self.checkOn("all", condition, message);
    },

    set: function prep(value, object)
    {
        var self = this;

        return self._preps.reduce(function(input, fn){
            return fn(input, object, self);
        }, value);
    },

    onSet: function addPrep(_prep)
    {
        var self = this;
        self._preps.push(_prep);

        return self;
    },

    references: function references(_ref)
    {
        var self = this;
        self.meta.references = _ref;

        return self;
    },

    index: function index(doIndex, isUnique)
    {
        var self = this;

        if (doIndex == null)
        {
            doIndex = true;
        }

        if (isUnique == null)
        {
            isUnique = false;
        }

        if (typeof doIndex !== 'boolean' && typeof doIndex !== 'string')
        {
            throw new Error('Index must have a boolean a string or boolean as its first paramter');
        }

        if (typeof isUnique !== 'boolean')
        {
            throw new Error('Index must have a boolean as the second option');
        }

        if (doIndex === false)
        {
            self.meta.indexes = [];
            return self;
        }

        if (doIndex === '')
        {
            throw new Error('Index name must be a non-empty string or true to auto-generate');
        }

        self.meta.indexes.push({
            name: doIndex,
            unique: isUnique,
        });
    },

    unique: function uniqueIndex(doIndex)
    {
        return this.index(doIndex, true);
    },

    isEqual(left, right)
    {
        return isEqual(this.set(left), this.set(right));
    },
};

common.runTestsForProperty = function(self, value, object)
{
    var i, check;
    for (i = 0; i < self._checks.length; i++)
    {
        check = self._checks[i];

        if (!check[1](value, object))
        {
            return check[0];
        }
    }

    return '';
}
