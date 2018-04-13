(function()
{
    var WidgetRegistry = require('../helpers/processor/WidgetRegistry.js');
    var WidgetHelper = require('../helpers/processor/WidgetHelper.js');
    var Utils = require('../helpers/processor/Utils.js');

    var Dashboard = function Dashboard(args, processData)
    {
        var self = WidgetHelper.init(this, 'Dashboard');

        self.name = args.name || 'Dashboard Sub Template';
        self.template = args.template || 'templates.admin.dashboard.table';

        var nowDate = new Date();
        nowDate.setDate(1);
        var nextDate = new Date();
        nextDate.setMonth(nowDate.getMonth()+1, 1);



        self.query = args.query || '';
        self.type = args.type || 'bar';
        self.x = args.x || '';
        self.y = args.y || '';
        self.timeFormat = args.timeFormat || '%Y-%m-%d';
        self.timeFill = args.timeFill || 'days';
        self.minTime = args.minTime || nowDate.toISOString().replace(/(\d{4}\-\d{2}\-\d{2}).*/, '$1');
        self.maxTime = args.maxTime || nextDate.toISOString().replace(/(\d{4}\-\d{2}\-\d{2}).*/, '$1');
        self.pivotFormat = args.pivotFormat || '';

        console.log('minTime', self.minTime);
        console.log('maxTime', self.maxTime);
        self._id = args._id || Math.random().toString(36).slice(2);
        WidgetHelper.addWidgetMethods(self);

    }

    WidgetRegistry.register(Dashboard, function(args, processData, parentScope)
    {
        var obj = new Dashboard(args, processData);

        if (typeof processData.query.from == 'string')
        {
            if (processData.query.from.search(/^\d{4}\-\d{2}\-\d{2}$/) == -1)
            {
                delete processData.query.from;
            }
        }
        if (typeof processData.query.to == 'string')
        {
            if (processData.query.to.search(/^\d{4}\-\d{2}\-\d{2}$/) == -1)
            {
                delete processData.query.to;
            }
        }

        console.log('processData.query', processData.query);

        if (typeof processData.query.from == 'undefined')
        {
            processData.query.from = obj.minTime;
        }
        else
        {
            obj.minTime = processData.query.from;
        }
        if (typeof processData.query.to == 'undefined')
        {
            processData.query.to = obj.maxTime;
        }
        else
        {
            obj.maxTime = processData.query.to;
        }

        if (new Date(obj.maxTime).getTime() - new Date(obj.minTime).getTime() > 86400 * 63 * 1000)
        {
            obj.timeFormat = '%Y-%m';
            obj.timeFill = 'months';
            obj.minTime = obj.minTime.replace(/\-\d{2}$/, '');
            obj.maxTime = obj.maxTime.replace(/\-\d{2}$/, '');
        }

        processData.dashboardId = obj._id;
        processData.dashboardQuery = obj.query;
        processData.chartType = obj.type;
        processData.chartX = obj.x;
        processData.chartY = obj.y;
        processData.timeFormat = obj.timeFormat;
        processData.timeFill = obj.timeFill;
        processData.pivotFormat = obj.pivotFormat;
        processData.minTime = obj.minTime;
        processData.maxTime = obj.maxTime;



        processData.dashboardQuery = processTemplate(processData.dashboardQuery, Object.assign(processData.query, {format:processData.timeFormat}));

        //console.log('processData.dashboardQuery', processData.dashboardQuery);
        //just return the value for this attribute...
        WidgetHelper.processSubTemplate(obj, processData, parentScope);

    });

    //no need to export as we this is being pushed to the widget registry.

    function processTemplate(template, data)
    {
        function findData(match, p1, offset, string){
            return p1.split('.').reduce(lookup, data);
        }

        if (template.search(/$\$\([^\)]+\)/) != -1) {
            let matches = template.match(/\$\(([^\)]+)\)/);
            if ((matches == null) || (matches.length == 1)) {
                return '';
            }
            return matches[1].split('.').reduce(lookup, data);
        }

        return template.replace(/\$\(([^\)]+)\)/g, findData);
    }

    function lookup(obj,i,ind,arr)
    {
        if (i.search(/\[\]$/) != -1) {

            i = i.replace(/\[\]$/, '');

            arr.splice(0, 1);

            let outArr = [];

            if (Array.isArray(obj[i]))
            {
                for (let k=0; k<obj[i].length; k++) {

                    outArr.push(Object.assign([],arr).reduce(lookup, obj[i][k]));
                }
            }

            // obj[i] = outArr;
            return outArr;
        }


        if ((typeof obj[i] == 'undefined') && (typeof obj != 'undefined') && (arr[0].search(/\[\]$/) != -1))
        {
            return obj;
        }
        return obj[i];
    }


}).call(this);