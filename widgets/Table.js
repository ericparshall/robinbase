(function()
{
    var WidgetRegistry = require('../helpers/processor/WidgetRegistry.js');
    var WidgetHelper = require('../helpers/processor/WidgetHelper.js');
    var Utils = require('../helpers/processor/Utils.js');
    var Debug = require('../helpers/Debug.js');
    var Schema = require('../helpers/Schema.js');
    var View = require('../helpers/View.js');
    var Config = require('../config.js');

    var Table = function Table(args, processData)
    {
        var self = WidgetHelper.init(this, 'Table');

        self.name = args.name || 'List Values';
        self.template = args.template || 'templates.empty';
        self._id = args._id || Math.random().toString(36).slice(2);
        self.dataSource = args.dataSource || processData['tableSource'] || [];
        self.tableModel = args.tableModel || processData['tableModel'] || [];
        self.useId = args.useId || processData['useId'] || '_id';

        self.models = {};// {'accounts':require('../Account.js').view()};
        for (var key in Config.adminModels)
        {
            self.models[key] = Config.adminModels[key].view;
        }

        WidgetHelper.addWidgetMethods(self);
    }

    WidgetRegistry.register(Table, function(args, processData, parentScope)
    {
        var obj = new Table(args, processData);
        //just return the value for this attribute...
      //  WidgetHelper.processSubTemplate(obj, processData, parentScope);
        //Debug.log('TABLE table model', obj.tableModel);
        var model = obj.models[obj.tableModel];

        function isAllowed(attr)
        {
            var _isAllowed = true;
            if ((typeof attr.omitContexts != 'undefined') &&
                (Array.isArray(attr.omitContexts)))
            {
                if (attr.omitContexts.indexOf('table') != -1)
                {
                    _isAllowed = false;
                }
            }
            if (attr.type == 'join')
            {
                _isAllowed = false;
            }
            return _isAllowed;
        }
        var th = '';

        var sortKey = processData.query.sk || '';
        var sortDir = processData.query.sd || '';
        if ((sortKey == '') && (sortDir == '') && (Array.isArray(model.defaultSort)))
        {
            if (model.defaultSort.length == 2)
            {
                sortKey = model.defaultSort[0];
                sortDir = model.defaultSort[1];
            }
        }

        const authData = processData.authData || {};
        const viewAttributes = model.getListAttributes(authData);
        for (var key in viewAttributes)
        {
            if (isAllowed(viewAttributes[key]) != true)
            {
                continue;
            }

            var insSort = '';
            var insSortIcon = '';
            if (sortKey == key)
            {
                if ((sortDir == 'asc') || (sortDir == 'desc'))
                {
                    insSort = sortDir;
                    if (sortDir == 'asc')
                    {
                        insSortIcon = '<i class="fa fa-level-up" aria-hidden="true"></i> ';
                    }
                    else
                    {
                        insSortIcon = '<i class="fa fa-level-down" aria-hidden="true"></i> ';
                    }
                }
            }

            th += '<th id="th_'+key+'" class="thKey '+insSort+'" key="'+key+'" sort="'+insSort+'">'+insSortIcon+viewAttributes[key].label+'</th>';
        }

        var outStr = '<table class="tableList" cellspacing="0" cellpadding="0"><thead><tr>'+th+'</tr></thead><tbody>';

        for (var i=0; i<obj.dataSource.length; i++)
        {
            var rowData = '';
            for (var key in viewAttributes)
            {
                if (isAllowed(viewAttributes[key]) != true)
                {
                    continue;
                }
                var dataKey = key;

                if (typeof viewAttributes[key].join == 'string')
                {
                    dataKey = viewAttributes[key].join;
                }

                const data = (dataKey === '_self' || dataKey === '_root') ? obj.dataSource[i] : obj.dataSource[i][dataKey];

                rowData += `<td id="listitem-${obj.dataSource[i][obj.useId]}-${key}">${View.displayField(viewAttributes[key], data)}</td>`;
            }

            let useLink = `/${model.route+'/view/'+obj.dataSource[i][obj.useId]}`;
            if (processData.viewObj.listLinkOverride)
            {
                useLink = View.replaceStr(processData.viewObj.listLinkOverride.value, processData.viewObj.listLinkOverride.valueMap, obj.dataSource[i]);
                processData.viewObj.sideBySide = false;
            }
            outStr += `<tr id="listitemcontainer-${obj.dataSource[i][obj.useId]}" onclick="renderSplitView('${useLink}', '${processData.viewObj.sideBySide}', false);">${rowData}</tr>`;
        }

        outStr += '</tbody></table>';

        if (obj.dataSource.length == 0)
        {
            outStr += '<div class="well warning">Could not find any results.</div>'
        }

        parentScope.callback(null, outStr);

    });

    //no need to export as we this is being pushed to the widget registry.


}).call(this);
