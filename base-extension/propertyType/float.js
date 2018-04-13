const Properties = require('../../helpers/SchemaProperties');

module.exports = function(Schema)
{
    Schema.registerPropertyType('float', function floatPropertyFactory() {
        return new Properties.FloatProperty();
    }, Properties.FloatProperty);
};