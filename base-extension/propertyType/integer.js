const Properties = require('../../helpers/SchemaProperties');

module.exports = function(Schema)
{
    Schema.registerPropertyType('integer', function integerPropertyFactory() {
        return new Properties.IntegerProperty();
    }, Properties.IntegerProperty);
};