const Properties = require('../../helpers/SchemaProperties');

module.exports = function(Schema)
{
    Schema.registerPropertyType('array', function arrayPropertyFactory() {
        return new Properties.ArrayProperty();
    }, Properties.ArrayProperty);
};