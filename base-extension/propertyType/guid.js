const Properties = require('../../helpers/SchemaProperties');

module.exports = function(Schema)
{
    Schema.registerPropertyType('guid', function guidPropertyFactory() {
        return new Properties.GuidProperty();
    }, Properties.GuidProperty);
};