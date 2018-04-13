const Properties = require('../../helpers/SchemaProperties');

module.exports = function(Schema)
{
    Schema.registerPropertyType('options', function optionsPropertyFactory(_choices) {
        var choices = [];

        for (var i=0; i<_choices.length; i++)
        {
            if (!Array.isArray(_choices[i]))
            {

                choices.push(_choices[i]);
            }
            else
            {
                if ((_choices[i].length > 0) && (!Array.isArray(_choices[i][0])))
                {
                    choices.push(_choices[i][0]);
                }
            }
        }

        return new Properties.OptionsProperty(choices);
    }, Properties.OptionsProperty);
};