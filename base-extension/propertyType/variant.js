const Properties = require('../../helpers/SchemaProperties');

module.exports = function(Schema)
{
    Schema.registerPropertyType('variant', function variantPropertyFactory(variantKey) {
        return new Properties.VariantProperty(variantKey);
    }, Properties.VariantProperty);
};