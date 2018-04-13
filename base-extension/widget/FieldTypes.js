const WidgetRegistry = require_robinbase('base:service:processor:WidgetRegistry');
const WidgetHelper = require_robinbase('base:service:processor:WidgetHelper');
const Debug = require_robinbase('base:Debug').prefix('widget:FieldTypes');

const FieldTypes = function FieldTypes(args, processData)
{
    var self = WidgetHelper.init(this, 'FieldTypes');

    self.name = args.name || 'Admin Form Field Types';
    self.template = args.template || 'templates.empty';
    self._id = args._id || Math.random().toString(36).slice(2);
    WidgetHelper.addWidgetMethods(self);
}

WidgetRegistry.register(FieldTypes, function(args, processData, parentScope)
{
    const app = require_robinbase('app');
    const fieldTypes = app._fieldTypes.join("\n\n");

    parentScope.callback(null, fieldTypes);
});

//no need to export as we this is being pushed to the widget registry.