const Properties = require('../../helpers/SchemaProperties');

module.exports = function(Schema)
{
    Schema.registerPropertyType('always', function alwaysPropertyFactory(alwaysValue) {
        return Schema.options([alwaysValue])
    });
};