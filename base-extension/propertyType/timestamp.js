const Properties = require('../../helpers/SchemaProperties');

module.exports = function(Schema)
{
    Schema.registerPropertyType('timestamp', function timestampPropertyFactory() {
        return new Properties.TimeStampProperty();
    }, Properties.TimeStampProperty);
};