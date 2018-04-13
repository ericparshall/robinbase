const Properties = require('../../helpers/SchemaProperties');

module.exports = function(Schema)
{
    Schema.registerPropertyType('datetime', function datetimePropertyFactory() {
        return new Properties.DateTimeProperty();
    }, Properties.DateTimeProperty);
};