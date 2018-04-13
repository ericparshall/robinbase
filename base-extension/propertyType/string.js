const Properties = require('../../helpers/SchemaProperties');

module.exports = function(Schema)
{
    Schema.registerPropertyType('string', function stringPropertyFactory() {
        return new Properties.StringProperty();
    }, Properties.StringProperty);
};