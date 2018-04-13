const Properties = require('../../helpers/SchemaProperties');

module.exports = function(Schema)
{
    Schema.registerPropertyType('email', function emailPropertyFactory() {
        return new Properties.EmailProperty();
    }, Properties.EmailProperty);
};