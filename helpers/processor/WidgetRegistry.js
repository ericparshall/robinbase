(function()
{
    var WidgetRegistry = function WidgetRegistry()
    {};
    WidgetRegistry.methods = {};
    WidgetRegistry.methodList = [];
    WidgetRegistry.classes = {};

    WidgetRegistry.register = function register(_classObj, _function)
    {
        if (typeof _function != 'function')
        {
            return;
        }

        _name = _classObj.name;
        //note that the function cannot be a method where it is dependent on the scope of this ...
        //.. The WidgetRegistry becomes its scope.

        WidgetRegistry.methods[_name] = _function;

        if (WidgetRegistry.methodList.indexOf(_name) == -1)
        {
            WidgetRegistry.methodList.push(_name);
            WidgetRegistry.classes[_name] = _classObj;
        }

    };

    module.exports = WidgetRegistry;
}).call(this);

var Include = require('../../widgets/Include.js');
var Table = require('../../widgets/Table.js');
var Dashboard = require('../../widgets/Dashboard.js');
