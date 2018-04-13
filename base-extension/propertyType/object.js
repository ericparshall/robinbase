const Properties = require('../../helpers/SchemaProperties');

module.exports = function(Schema)
{
    Schema.registerPropertyType('object', function objectPropertyFactory() {
        return new Properties.ObjectProperty();
    }, Properties.ObjectProperty);
};