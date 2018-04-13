const express = require('express');

function createCrudRouter(Model, modelKey, out, buildProcess)
{
    const Config = require('../../config.js');
    const Lets = require('../Lets.js');
    const router = express.Router();
    const view = Model.view || {};
    const route = view.route;
    var _multer = require('multer');
    var multer = _multer({dest: Config.RB_TMPDIR || './tmp'});
    if (!route)
    {
        return null;
    }
    const Debug = require('../Debug.js').prefix(`router:crud:${route}`);

    router.get('/'+route, function(req, res, next) {
        const qs = require('qs');
        var defRouteView = '/list/0';

        if (typeof view.defaultView == 'string')
        {
            defRouteView = view.defaultView;
        }

        return res.redirect('/'+route+defRouteView+(Object.keys(req.query).length ? '?'+qs.stringify(req.query) : ''));
    });

    router.get('/'+route+'/new', function(req, res, next) {
        if (res.locals.apiMode == true)
        {
            next();
        }

        var processData = buildProcess(req, res);
        if (res.locals.authorization && res.locals.authorization.isAccessDenied('create'))
        {
            processData.warning = "You do not have permission to perform this action";
            return out(res, 'templates.admin.warning', processData);
        }
        processData.allowSave = {modelRoute:res.locals.view.route, saveChangesText: res.locals.view.createText || 'Save Changes'};
        processData.context = 'create';

        var obj = new Model(req.query);
        try
        {
            obj._id = Model.generateId();
        }
        catch (err)
        {
            console.log('no id method', err);
        }

        console.log('obj._id', obj._id);
        processData.objId = obj._id ? obj._id.toString() : '';
        processData.dataSource = obj;
        processData.obj = JSON.stringify(obj);

        var template = 'templates.admin.edit';


        if (res.locals.view.templates && res.locals.view.templates.edit)
        {
            template = res.locals.view.templates.edit;
        }
        out(res, template, processData);
    });

    var upload;
    if (Array.isArray(Model.uploads))
    {
        Debug.log('Uploads allowed for: ', modelKey);
        upload = multer.fields(Model.uploads);
    }
    else if ((Model.uploads != null) && (typeof Model.uploads === 'object'))
    {
        let uploadType = Model.uploads.type;

        if (uploadType === 'any')
        {
            upload = multer.any();
        }
        else
        {
            upload = multer.none();
        }
    }
    else
    {
        upload = multer.none();
    }

    router.post('/'+route+'/create', upload, function(req, res, next) {
        var processData = buildProcess(req, res);
        processData.view = res.locals.view;
        if (res.locals.authorization && res.locals.authorization.isAccessDenied('create'))
        {
            return res.showError('You do not have permission to perform this action', 401);
        }

        Lets.upload((Config.uploaders||{}).default, req.files, req.body, Model.uploads, function doCreate(err)
        {
            if (err)
            {
                return next(err);
            }
            var setter = req.body;
            var useId = Model.schema.useId;
            var subSaves = buildSubKeys(processData, setter, useId, res);

            Model.crud.create(setter, res.locals.authorization, Lets.try(next, function(err, resp) {
                if (err != null)
                {
                    return res.showError(err.message || err);
                }

                if (subSaves.length > 0)
                {
                    var subRespObjs = {};
                    updateSubs(res.locals.authorization, subSaves, 0, subRespObjs, Lets.try(next, function(err, subResponses){
                        if (err != null)
                        {
                            return res.showError(err.message || err);
                        }
                        Object.assign(resp, subRespObjs);

                        res.respond({values:setter, result:resp}, 200);
                    }));
                    return;
                }

                res.respond({values:setter, result:resp}, 200);
            }));
        });
    });

    router.post('/'+route+'/update/:id', upload, function(req, res, next) {
        if (res.locals.authorization && res.locals.authorization.isAccessDenied('update'))
        {
            return res.showError("You do not have permission to perform this action", 401);
        }

        Lets.upload((Config.uploaders||{}).default, req.files, req.body, Model.uploads, doUpdate);
        function doUpdate(err)
        {
            if (err)
            {
                return next(err);
            }

            var processData = buildProcess(req, res);
            processData.objId = req.params.id || '';

            var useId = Model.schema.useId;
            var query = {};
            query[useId] = Model.schema.props[useId].set(processData.objId, null);


            //delete passwords and other special types that should only update on a direct set.
            var setter = req.body;

            Debug.debug('setter', setter);


            var subSaves = buildSubKeys(processData, setter, useId, res);

            Debug.debug('subSaves', subSaves);



            Model.crud.update(query, setter, res.locals.authorization, Lets.try(next, function(err, resp) {
                if (err != null)
                {
                    return res.showError(err.message || err);
                }

                if (subSaves.length > 0)
                {
                    var subRespObjs = {};
                    updateSubs(res.locals.authorization, subSaves, 0, subRespObjs, Lets.try(next, function(err, subResponses){
                        if (err != null)
                        {
                            return res.showError(err.message || err);
                        }
                        Object.assign(resp, subRespObjs);

                        res.respond({values:setter, result:resp}, 200);
                    }));
                    return;
                }

                res.respond({values:setter, result:resp}, 200);
            }));
        }

    });

    if (Model.cloneable)
    {
        router.get("/"+route+"/clone/:id", function(req, res, next)
        {
            if (res.locals.apiMode == true)
            {
                next();
            }

            var processData = buildProcess(req, res);
            processData.objId = req.params.id || "";
            processData.view = res.locals.view;


            if (res.locals.authorization && res.locals.authorization.isAccessDenied("create"))
            {
                processData.warning = "You do not have permission to perform this action";
                return out(res, "templates.admin.warning", processData);
            }
            processData.context = "clone";


            var useId = Model.schema.useId;
            var query = {};
            query[useId] = Model.schema.props[useId].set(processData.objId, null);

            var options = {skip:0, limit:1};
            var authData = (res.locals.authorization && res.locals.authorization.data) || {};
            options = Lets.join(res.locals.view, options, req.query, processData.context, authData);

            Model.crud.getOne(query, options, res.locals.authorization, Lets.try(next, function(err, resp)
            {
                if (err != null)
                {
                    return next(err || err.message);
                }
                if (resp == null)
                {
                    processData.warning = "No data could be found for this ID.";
                    return out(res, "templates.admin.warning", processData);
                }

                var obj = resp;

                processData.allowSave = {modelRoute:res.locals.view.route, saveChangesText: res.locals.view.cloneText || 'Save Changes'};

                processData.dataSource = obj;
                processData.obj = JSON.stringify(obj);

                var template = "templates.admin.edit";
                if (res.locals.view.templates && res.locals.view.templates.edit)
                {
                    template = res.locals.view.templates.edit;
                }
                out(res, template, processData);
            }));
        });

        router.post('/'+route+'/clone/:id', upload, function(req, res, next)
        {
            if (res.locals.authorization && res.locals.authorization.isAccessDenied('create'))
            {
                return res.showError("You do not have permission to perform this action", 401);
            }

            Lets.upload((Config.uploaders||{}).default, req.files, req.body, Model.uploads, doUpdate);
            function doUpdate(err)
            {
                if (err)
                {
                    return next(err);
                }

                var processData = buildProcess(req, res);
                processData.objId = req.params.id || '';

                var useId = Model.schema.useId;
                var query = {};
                query[useId] = Model.schema.props[useId].set(processData.objId, null);


                //delete passwords and other special types that should only update on a direct set.
                var setter = req.body;

                Debug.debug('setter', setter);


                var subSaves = buildSubKeys(processData, setter, useId, res);

                Debug.debug('subSaves', subSaves);

                Model.crud.getOne(query, setter, res.locals.authorization, Lets.try(next, function(err, original) {
                    if (err != null)
                    {
                        return res.showError(err.message || err);
                    }

                    Model.crud.clone(original, setter, {}, res.locals.authorization, Lets.try(next, function(err, resp) {
                        if (err != null)
                        {
                            return res.showError(err.message || err);
                        }

                        // if (subSaves.length > 0)
                        // {
                        //     var subRespObjs = {};
                        //     updateSubs(res.locals.authorization, subSaves, 0, subRespObjs, Lets.try(next, function(err, subResponses){
                        //         if (err != null)
                        //         {
                        //             return res.showError(err.message || err);
                        //         }
                        //         Object.assign(resp, subRespObjs);
                        //
                        //         res.respond({values:setter, result:resp}, 200);
                        //     }));
                        //     return;
                        // }

                        res.respond({values:setter, result:resp}, 200);
                    }));
                }));
            }

        });
    }

    router.post('/'+route+'/delete/:id', function(req, res, next) {
        var processData = buildProcess(req, res);
        processData.objId = req.params.id || '';
        processData.view = res.locals.view;

        if (res.locals.authorization && res.locals.authorization.isAccessDenied('delete'))
        {
            return res.showError("You do not have permission to perform this action");
        }

        var useId = Model.schema.useId;
        var query = {};
        query[useId] = Model.schema.props[useId].set(processData.objId, null);

        Model.crud.delete(query, res.locals.authorization, Lets.try(next, function(err, resp) {
            if (err != null)
            {
                return res.showError(err.message || err);
            }

            res.respond({result:resp}, 200);
        }));
    });

    router.get('/'+route+'/select', function(req, res, next) {
        var useId = Model.schema.useId;
        var valueKey = useId;
        var selectKey = useId;
        if (res.locals.authorization && res.locals.authorization.isAccessDenied('view'))
        {
            Debug.log('ACCESS DENIED SELECT[1]')

            return res.respond("You do not have permission to perform this action");
        }

        // vk = value key
        if (req.query.vk)
        {
            valueKey = req.query.vk;
        }

        // dk = display key
        if (req.query.dk)
        {
            selectKey = req.query.dk;
        }
        else if (res.locals.view.selectKey)
        {
            selectKey = res.locals.view.selectKey;
        }

        var fields = {
            [valueKey]: 1,
        }

        let dks = (Array.isArray(selectKey) ? selectKey : [selectKey]);

        dks.forEach((sk) => {
            fields[sk] = 1;
        });


        var filterQ = Lets.query(Model, {}, req.query);
        if (req.query.selected)
        {
            var useValue = req.query.selected;
            if (Model.schema.props[valueKey])
            {
                useValue = Model.schema.props[valueKey].set(req.query.selected);
            }
            // this is an immutable value so only return the one result
            filterQ = {$and: [{[valueKey]: useValue}, filterQ]};
        }

        Debug.debug('FILTER: ', filterQ);
        Model.crud.get(filterQ, {fields: fields, raw: true}, res.locals.authorization, Lets.try(next, function(err, resp) {
            if (err != null)
            {
                return res.showError(err.message || err);
            }

            var result = (resp || []).map(function(item){
                return [
                    item[valueKey],
                ].concat(dks.map((dk) => item[dk]));
            });

            res.respond(result);
        }));

    });

    router.get('/'+route+'/view/:id', function(req, res, next) {
        var processData = buildProcess(req, res);
        processData.objId = req.params.id || '';
        processData.context = "edit";

        if (res.locals.authorization && res.locals.authorization.isAccessDenied('view'))
        {
            processData.warning = "You do not have permission to perform this action";
            return out(res, 'templates.admin.warning', processData);
        }


        var useId = Model.schema.useId;
        var query = {};
        query[useId] = Model.schema.props[useId].set(processData.objId, null);

        var options = {skip:0, limit:1};

        var authData = (res.locals.authorization && res.locals.authorization.data) || {};
        options = Lets.join(res.locals.view, options, req.query, processData.context, authData);

        Model.crud.getOne(query, options, res.locals.authorization, Lets.try(next, function(err, resp) {
            if (err != null)
            {
                return next(err || err.message);
            }
            if (resp == null)
            {
                processData.warning = "No data could be found for this ID.";
                return out(res, 'templates.admin.warning', processData);
            }

            var obj = resp;

            if (!res.locals.authorization || !res.locals.authorization.isAccessDenied("update", obj))
            {
                if (typeof Model.crud.update == 'function')
                {
                    processData.allowSave = {modelRoute:res.locals.view.route, saveChangesText: res.locals.view.updateText || 'Save Changes'};
                }
            }

            if (!res.locals.authorization || !res.locals.authorization.isAccessDenied("update", obj))
            {
                if (typeof Model.crud.clone == 'function' && Model.cloneable)
                {
                    processData.allowClone = {modelRoute:res.locals.view.route, modelId:processData.objId};
                }
            }

            if (!res.locals.authorization || !res.locals.authorization.isAccessDenied("delete", obj))
            {
                if (typeof Model.crud.delete == 'function')
                {
                    processData.allowDelete = {modelRoute:res.locals.view.route};
                }
            }

            processData.dataSource = obj;
            processData.obj = JSON.stringify(obj);

            var template = 'templates.admin.edit';
            if (res.locals.view.templates && res.locals.view.templates.edit)
            {
                template = res.locals.view.templates.edit;
            }
            out(res, template, processData);
        }));

    });

    router.get('/'+route+'/list/:pageNum', function(req, res, next) {
        var processData = buildProcess(req, res);

        if (res.locals.authorization && res.locals.authorization.isAccessDenied('view'))
        {
            processData.warning = "You do not have permission to perform this action";
            return out(res, 'templates.admin.warning', processData);
        }

        if (typeof req.query['$group'] != 'undefined')
        {
            res.locals.apiMode = true; //always return JSON for now.
            res.locals.aggregate = true;
        }
        else if (req.accepts(['html', 'json']) === 'json')
        {
            res.locals.apiMode = true;
        }
//MAP_GET(VALUE, ['discount'=>'DISCOUNTS'], VALUE)
        var filterQ = Lets.query(Model, {}, req.query);

        Model.crud.count(filterQ, res.locals.authorization, function(countErr, count) {
            Debug.debug('LOCAL VIEW: ', res.locals.view);

            processData.sort = res.locals.view.defaultSort || ['_id', 'desc'];

            var _isSorting = false;
            if ((typeof req.query.sk != 'undefined') && (typeof req.query.sd != 'undefined'))
            {

                const authData = res.locals.authorization ? res.locals.authorization.data : {};
                const viewAttributes = res.locals.view.getListAttributes(authData);
                if (typeof viewAttributes[req.query.sk] != 'undefined')
                {
                    _isSorting = true;
                    var attr = viewAttributes[req.query.sk];
                    if ((typeof attr.omitContexts != 'undefined') &&
                        (Array.isArray(attr.omitContexts)))
                    {
                        if (attr.omitContexts.indexOf('table') != -1)
                        {
                            _isSorting = false;
                        }
                    }
                }
                if (res.locals.aggregate == true)
                {
                    processData.sort = [req.query.sk, req.query.sd];
                }
                else
                {
                    if (_isSorting == true)
                    {
                        processData.sort = [req.query.sk, req.query.sd];
                    }
                    else
                    {
                        if ((req.query.sk == '-') && (req.query.sd == '-'))
                        {
                            processData.sort = [req.query.sk, req.query.sd];
                        }
                    }
                }

            }

            if (res.locals.authorization && !res.locals.authorization.isAccessDenied('create'))
            {
                if (typeof Model.crud.create == 'function')
                {
                    processData.allowCreate = {modelRoute:res.locals.view.route};
                }
            }

            if (Array.isArray(Model.exportFields) && res.locals.authorization && !res.locals.authorization.isAccessDenied('export'))
            {
                processData.allowExport = {modelRoute:res.locals.view.route};
            }

            if (res.locals.view.search == true)
            {
                processData.allowSearch = {modelRoute:res.locals.view.route, name:res.locals.view.name, currentSearchTerm: req.query.search || '', searchPath: 'list/0'};
            }

            processData.tableHelper = {};
            processData.tableHelper.total = count;
            processData.tableHelper.page = req.params.pageNum;
            processData.tableHelper.paginate = parseInt(req.query.pageSize || Config.RB_PAGE_SIZE || 50);
            processData.authorization = res.locals.authorization;

            var pageSize = processData.tableHelper.paginate;

            if (pageSize > 1000)
            {
                pageSize = 1000;
            }

            var options = {skip: req.params.pageNum*pageSize,
                limit: pageSize,
                sort:processData.sort};


            var authData = (res.locals.authorization && res.locals.authorization.data) || {};
            options = Lets.join(res.locals.view, options, req.query, "table", authData);


            if ((typeof filterQ['$text'] != 'undefined') && (_isSorting == false))
            {
                var metaSort = {searchResultScore:{'$meta':'textScore'}};
                if (typeof options.fields == 'undefined')
                {
                    options.fields = metaSort;
                }
                else
                {
                    options.fields.searchResultScore = {'$meta':'textScore'};
                }
                options.sort = metaSort;
            }

            if (typeof req.query['$group'] != 'undefined')
            {
                function parseNum(inO)
                {
                    for (var key in inO)
                    {
                        if (!isNaN(inO[key]))
                        {
                            inO[key] = parseInt(inO[key]);
                        }
                        if (typeof inO[key] == 'object')
                        {
                            inO[key] = parseNum(inO[key]);
                        }
                        if (typeof inO[key] == 'string')
                        {
                            Debug.debug('inO[key]', inO[key]);
                            var matches = inO[key].match(/^oid\(([^\)]+)\)/);
                            if ((matches != null) && (matches.length > 1))
                            {
                                inO[key] = new Mongo.ObjectID(matches[1]); //TODO: This isn't defined??
                            }
                        }
                    }
                    return inO;
                }
                req.query['$group'] = parseNum(req.query['$group']);
                if (!Array.isArray(req.query['$group']))
                {
                    options.groups = [req.query['$group']];
                }
                else
                {
                    options.groups = req.query['$group'];
                }
            }


            Model.crud.get(filterQ,
                options, res.locals.authorization, Lets.try(next, function(err, resp) {

                    if (err != null)
                    {
                        return next(err);
                    }


                    if (processData.tableHelper.total == 0)
                    {
                        processData.tableHelper.label = 'No results';
                    }
                    else
                    {
                        var toAmount = (req.params.pageNum * processData.tableHelper.paginate)+resp.length;
                        if (processData.tableTotal < processData.tableHelper.paginate)
                        {
                            toAmount = resp.length;
                        }
                        processData.tableHelper.label = `<span style="text-align:right;">Page</span>`;
                    }
                    processData.tableHelper.modelName = res.locals.view.name;
                    processData.tableHelper.modelRoute = res.locals.view.route;
                    processData.tableHelper.tableFrom = req.params.pageNum * processData.tableHelper.paginate;
                    processData.tableHelper.tableTo = req.params.pageNum * processData.tableHelper.paginate + resp.length;
                    processData.tableSource = resp;
                    if (res.locals.apiMode == true || res.locals.isJson)
                    {
                        var nextPage = parseInt(processData.tableHelper.page)+1;
                        var nextPath = '/'+res.locals.view.route+'/list/'+nextPage;
                        var maxPages = Math.ceil(processData.tableHelper.total / processData.tableHelper.paginate)-1;
                        if (processData.tableHelper.page >= maxPages)
                        {
                            nextPath = '';
                        }
                        var previous = '/'+res.locals.view.route+'/list/'+(processData.tableHelper.page-1);
                        if (processData.tableHelper.page <= 0)
                        {
                            previous = '';
                        }
                        else
                        {
                            if (processData.tableHelper.page > maxPages)
                            {
                                previous = '/'+res.locals.view.route+'/list/'+maxPages;
                            }
                        }

                        var output = resp;
                        if (res.locals.aggregate != true)
                        {
                            output = resp.map(function(i){return i.toJSON()});
                        }
                        processData.dataSource = {list:output,
                            total:processData.tableHelper.total,
                            next:nextPath,
                            previous:previous
                        }
                    }
                    else
                    {
                        processData.tableSource = resp.map(function(i){return i.toJSON()});
                    }

                    processData.context = 'table';
                    processData.isRoot = true;
                    processData.tableModel = res.locals.modelKey;
                    Debug.debug('MODEL KEY: ', res.locals.modelKey);
                    processData.useId = Model.schema.useId;
                    //Debug.log("processData", processData);
                    //res.html('templates.admin.list', processData);
                    var template = 'templates.admin.list';
                    if (res.locals.view.templates && res.locals.view.templates.table)
                    {
                        template = res.locals.view.templates.table;
                    }
                    out(res, template, processData);
                }));
        });
    });

    if (Array.isArray(Model.exportFields) && Model.exportFields.length > 0 && Model.storage && typeof Model.storage.getExporter === 'function')
    {
        (function(key)
        {
            // TODO: this needs to be put in a shared cache (i.e. Redis) since this will not scale
            var activeExports = {};
            router.post('/'+route+'/export/start', function(req, res, next)
            {
                var exportFields = Model.exportFields;
                var filterQ = Lets.query(Model, {}, req.query);

                if (res.locals.authorization)
                {

                    if (res.locals.authorization.isAccessDenied('export'))
                    {
                        processData.warning = "You do not have permission to perform this action";
                        return out(res, 'templates.admin.warning', processData);
                    }

                    filterQ = res.locals.authorization.applyQueryFilters("view", filterQ);

                    var deniedFields = res.locals.authorization.getDeniedKeys(exportFields, "export", null);
                    exportFields = exportFields.filter(function(field){
                        return deniedFields.indexOf(field) === -1;
                    })
                }

                var exporter = res.locals.Model.storage.getExporter();
                var info = exporter.export(Model, exportFields, filterQ, "csv");
                res.respond({fileName: info[1], id: info[0]});

                // stash the exporter so it can be queried for later...
                activeExports[info[0]] = exporter;

                // also set a timeout to delete the reference to the exporter object to prevent a memory leak
                setTimeout(function(id){
                    delete activeExports[id];
                }.bind(null, info[0]), 1000 * 60 * 60 /* One hour ??? */);
            });

            router.get('/'+route+'/export/:id/check', function(req, res)
            {
                var id = req.params.id;
                var exporter = activeExports[id];
                if (!exporter)
                {
                    return res.showError("There is no upload with that id", 404);
                }

                res.respond({status: exporter.status, url: exporter.url});
            });

            router.get('/'+route+'/export/:id/kill', function(req, res)
            {
                // TODO
                return next();
            });


        })(modelKey);
    }

    function buildSubKeys(processData, setter, useId, res)
    {
        const app = require_robinbase('app');
        var subSaves = [];
        if (typeof processData.view.subEditKeys == 'object')
        {
            var subKeys = processData.view.subEditKeys;
            Debug.debug('subKeys', subKeys);
            for (var key in subKeys)
            {
                const SubModel = typeof subKeys[key] === 'string' ? app.models[subKeys[key]] : subKeys[key];
                if (typeof SubModel !== 'function')
                {
                    continue;
                }
                Debug.debug('subKey', key);

                if (typeof setter[key] != 'undefined')
                {

                    try
                    {
                        Debug.debug('set', setter[key]);
                        for (var inKey in setter[key])
                        {
                            Debug.debug('checkforDelete?', inKey);
                            var updateMethod = 'update';

                            if (inKey.search(/\-NEW$/) != -1)
                            {
                                updateMethod = 'create';
                                //inKey = inKey.replace(/\-NEW$/, '');

                                var submitObj = setter[key][inKey];
                                var sKeys = Object.keys(submitObj);

                                submitObj[SubModel.schema.useId] = inKey;
                                var sObj = new SubModel(submitObj);

                                var oObj = {};
                                for (var i=0; i<sKeys.length; i++)
                                {
                                    oObj[sKeys[i]] = sObj[sKeys[i]];
                                }


                                subSaves.push({model:SubModel,
                                    query: inKey,
                                    setter:oObj,
                                    key:key,
                                    updateMethod:updateMethod
                                });
                            }
                            else if (inKey.search(/\-DEL$/) != -1)
                            {
                                updateMethod = 'delete';
                                inKey = inKey.replace(/\-DEL$/, '');
                                var dQuery = {};
                                dQuery[useId] = SubModel.schema.prepareId(inKey, null);
                                subSaves.push({model:SubModel,
                                    query: dQuery,
                                    setter:{},
                                    key:key,
                                    updateMethod:updateMethod
                                });
                            }
                            else
                            {

                                var submitObj = setter[key][inKey];
                                var sKeys = Object.keys(submitObj);

                                submitObj[SubModel.schema.useId] = inKey;
                                var sObj = new SubModel(submitObj);

                                var oObj = {};
                                for (var i=0; i<sKeys.length; i++)
                                {
                                    oObj[sKeys[i]] = sObj[sKeys[i]];
                                }

                                var oQuery = {};
                                oQuery[useId] = SubModel.schema.prepareId(inKey, null);
                                subSaves.push({model:SubModel,
                                    query: oQuery,
                                    setter:oObj,
                                    key:key,
                                    updateMethod:updateMethod
                                });
                            }
                        }

                    }
                    catch(err){
                        if (err != null)
                        {
                            return res.showError(err.message || err);
                        }
                    }
                }
            }
        }
        return subSaves;
    }

    function updateSubs(auth, subObj, iter, responseObj, callback)
    {
        if (typeof subObj[iter] == 'undefined')
        {
            return callback(null, true);
        }

        let subAuth = null;
        if (auth.parent)
        {
            const useCollection = subObj[iter].model.modelKey;
            subAuth = auth.parent.getAuthorization(useCollection);
        }

        switch (subObj[iter].updateMethod)
        {
            case 'create':
            {
                subObj[iter].model.crud.create(subObj[iter].setter, subAuth, function(err, resp) {
                    if (err != null)
                    {
                        return callback(err);
                    }
                    if (typeof responseObj[subObj[iter].key] == 'undefined')
                    {
                        responseObj[subObj[iter].key] = {};
                    }
                    resp.__oldkey__ = subObj[iter].query;
                    responseObj[subObj[iter].key][resp[subObj[iter].model.schema.useId]] = resp;

                    Debug.debug('RETURNS2!!!', responseObj);
                    iter += 1;
                    updateSubs(auth, subObj, iter, responseObj, callback);

                    //res.respond({values:setter, result:resp}, 200);
                });
                break;
            }
            case 'delete':
            {
                subObj[iter].model.crud.delete(subObj[iter].query, subAuth, function(err, resp) {
                    if (err != null)
                    {
                        return callback(err.message || err);
                    }

                    iter += 1;
                    updateSubs(auth, subObj, iter, responseObj, callback);
                });

                break;
            }
            default:
            {
                subObj[iter].model.crud.update(subObj[iter].query, subObj[iter].setter, subAuth, function(err, resp) {
                    if (err != null)
                    {
                        return callback(err.message || err, null);
                    }

                    Debug.debug('RETURNS!!!', resp);

                    if (typeof responseObj[subObj[iter].key] == 'undefined')
                    {
                        responseObj[subObj[iter].key] = {};
                    }
                    responseObj[subObj[iter].key][resp[subObj[iter].model.schema.useId]] = resp;

                    Debug.debug('RETURNS2!!!', responseObj);
                    iter += 1;
                    updateSubs(auth, subObj, iter, responseObj, callback);

                });
                break;
            }
        }



    }

    return router;
}



createCrudRouter.allowedActions = function(context, authorization, Model, isRoot)
{
    var out = [];
    if (!Model)
    {
        return [];
    }
    var view = Model.view || {};
    var modelRoute = view.route;
    if (!modelRoute)
    {
        return [];
    }
    console.log('what is my context?', context);
    if (isRoot != true)
    {
        if (!authorization || !authorization.isAccessDenied('view'))
        {
            out.push ({
                path: `/${modelRoute}`,
                icon: 'fa fa-chevron-left',
                text: 'View All'
            });
        }

    }
    else
    {
        if(!authorization || !authorization.isAccessDenied('create'))
        {
            if (typeof Model.crud.create == 'function' && !view.hideCreateMenu)
            {
                out.push({
                    path: `/${modelRoute}/new`,
                    icon: 'fa fa-plus',
                    text: 'New'
                });
            }
        }

        if (!authorization || !authorization.isAccessDenied('export'))
        {
            if (Array.isArray(Model.exportFields))
            {
                out.push({
                    linkClass: 'exportLink',
                    path: `/${modelRoute}/export/start`,
                    icon: 'fa fa-download',
                    text: ' Export'
                });
            }
        }
    }

    return out;
}

module.exports = createCrudRouter;
