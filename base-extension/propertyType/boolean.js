const Properties = require('../../helpers/SchemaProperties');

module.exports = function(Schema)
{
    Schema.registerPropertyType('boolean', function booleanPropertyFactory() {
        return new Properties.BooleanProperty();
    }, Properties.BooleanProperty);
};