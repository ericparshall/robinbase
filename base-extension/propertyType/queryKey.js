const Properties = require('../../helpers/SchemaProperties');

module.exports = function(Schema)
{
    Schema.registerPropertyType('queryKey', function queryKeyPropertyFactory() {
        return Schema.guid.guidPattern('xxxxxxxxxxxx').minLength(12).maxLength(12)
    });
};
