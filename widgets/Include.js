(function()
{
    var WidgetRegistry = require('../helpers/processor/WidgetRegistry.js');
    var WidgetHelper = require('../helpers/processor/WidgetHelper.js');
    var Utils = require('../helpers/processor/Utils.js');

    var Include = function Include(args, processData)
    {
        var self = WidgetHelper.init(this, 'Include');

        self.name = args.name || 'Include Sub Template';
        self.template = args.template || 'templates.empty';
        self._id = args._id || Math.random().toString(36).slice(2);
        WidgetHelper.addWidgetMethods(self);

    }

    WidgetRegistry.register(Include, function(args, processData, parentScope)
    {
        var obj = new Include(args, processData);
        //just return the value for this attribute...
        if (processData.query)
        {
            if ((Array.isArray(processData.query.excludeTemplate)) && (processData.query.excludeTemplate.indexOf(obj.template) != -1))
            {
                parentScope.callback(null, '');
                return;
            }
        }

        WidgetHelper.processSubTemplate(obj, processData, parentScope);

    });

    //no need to export as we this is being pushed to the widget registry.


}).call(this);