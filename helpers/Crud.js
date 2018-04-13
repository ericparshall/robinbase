var Crud = {};
var Schema = require('./Schema');

Crud.addCrudToClass = function(myClass)
{
    var Debug = require('./Debug').prefix('crud:'+myClass.name);

    var requiredHooks = [
        "beforeCreate",
        "afterCreate",
        "beforeUpdate",
        "afterUpdate",
        "beforeSave",
        "afterSave",
        "beforeDelete",
        "afterDelete",
        "beforeClone",
        "afterClone",
    ];

    requiredHooks.forEach(function(hookName)
    {
        if (typeof myClass.prototype[hookName] === 'function')
        {
            myClass.on(hookName, function(instance, callback)
            {
                instance[hookName](callback);
            });
        }
    });

    if (typeof myClass.crud === 'undefined')
    {
        myClass.crud = {};
    }

    if (typeof myClass.crud.get === 'undefined')
    {
        myClass.crud.get = function(_query, _options, authorization, callback)
        {
            if (arguments.length === 2)
            {
                callback = _options;
                _options = {};
                authorization = null;
            }
            else if (arguments.length === 3)
            {
                callback = authorization;
                authorization = null;
            }

            var query = _query || {};
            var options = _options || {};

            if (authorization)
            {
                if (authorization.isAccessDenied("view"))
                {
                    return callback("You do not have permission to perform this action.", null);
                }
                query = authorization.applyQueryFilters("view", query);
                options.deniedKeys = myClass.view.hidden;
            }

            options.sort = options.sort || [myClass.schema.useId, 'desc'];

            if ((options.sort[0] == '-') && (options.sort[1] == '-'))
            {
                delete options.sort;
            }

            if (Array.isArray(_options.joins))
            {
                options.joins = _options.joins;

                // pre-filter the joins
                options.joins = options.joins.filter(function(joinKey)
                {
                    if (!myClass.joins || !myClass.joins[joinKey])
                    {
                        if (joinKey !== '_root' && joinKey !== '_self') {
                            Debug.warn(myClass.joins, ' ' + ' does not have ' + joinKey);
                        }
                        return false;
                    }
                    if (authorization)
                    {
                        var joinAuthorization = null;
                        if (authorization.parent)
                        {
                            joinAuthorization = authorization.parent.getAuthorization(myClass.joins[joinKey].collection);
                        }
                        if (!joinAuthorization)
                        {
                            return true;
                        }

                        return !joinAuthorization.isAccessDenied('view');
                    }

                    return true;
                });
            }


            myClass.storage.get(myClass, query, options, function(err, results)
            {
                if (Array.isArray(options.groups))
                {
                    return callback(err, results);
                }
                if (Array.isArray(results))
                {
                    if (options.raw)
                    {
                        return callback(err, results);
                    }
                    results = results.map(function(result){
                        if (!(result instanceof myClass))
                        {
                            result = new myClass(result);
                        }
                        var denyKeys = [];
                        if (authorization)
                        {
                            denyKeys = authorization.getDeniedKeys(Object.keys(result), "view", result);
                            result[Schema._authorization] = authorization
                        }

                        denyKeys.forEach(function(key){
                            result[Schema._hidekeys]
                                .add(key)
                        });

                        // need to sanitize joined values
                        if (authorization && options.joins && options.joins.length)
                        {
                            options.joins.forEach(function(join)
                            {
                                if (!myClass.joins || !myClass.joins[join])
                                {
                                    return;
                                }

                                // is "raw" the key we are going to use here?
                                // it is intended to allow aggregated data to
                                // be included in the join which will not be
                                // objectified
                                if (myClass.joins[join].raw)
                                {
                                    // raw data is never filtered
                                    return;
                                }

                                var joinAuthorization = null;
                                if (authorization.parent)
                                {
                                    var useCollection = myClass.joins[join].model || myClass.joins[join].collection;
                                    joinAuthorization = authorization.parent.getAuthorization(useCollection);
                                }

                                if (!joinAuthorization)
                                {
                                    // if it doesn't exist, it means the collection does
                                    // not require authorization
                                    return;
                                }

                                var joinValues;
                                if (result[join] && !Array.isArray(result[join]))
                                {
                                    joinValues = [result[join]];
                                }
                                else if (result[join])
                                {
                                    joinValues = result[join];
                                }
                                else
                                {
                                    return;
                                }

                                joinValues.forEach(function(value)
                                {
                                    var joinDenyViewKeys = joinAuthorization.getDeniedKeys(Object.keys(value), "view", value);
                                    joinDenyViewKeys.forEach(function(key){
                                        value[Schema._hidekeys].add(key);
                                    });
                                });

                                joinValues = joinValues.filter(function(joinValue)
                                {
                                    var json = joinValue.toJSON();
                                    return Object.keys(json).length > 0;
                                });
                            });
                        }

                        return result;
                    });
                }

                callback(err, results);
            });
        }
    }

    if (typeof myClass.crud.getOne == 'undefined')
    {
        myClass.crud.getOne = function(_query, _options, authorization, callback)
        {
            if (arguments.length === 2)
            {
                callback = _options;
                _options = {};
                authorization = null;
            }
            else if (arguments.length === 3)
            {
                callback = authorization;
                authorization = null;
            }

            _options = Object.assign({}, _options, {limit: 1});

            myClass.crud.get(_query, _options, authorization, function(err, results){
                var result = null;

                if (Array.isArray(results) && results.length > 0)
                {
                    result = results[0];
                }

                callback(err, result);
            });
        }
    }

    if (typeof myClass.crud.count == 'undefined')
    {
        myClass.crud.count = function(_query, authorization, callback)
        {
            if (arguments.length === 2)
            {
                callback = authorization;
                authorization = null;
            }

            if (authorization)
            {
                if (authorization.isAccessDenied("view"))
                {
                    return callback("You do not have permission to perform this action.", null);
                }
                query = authorization.applyQueryFilters("view", _query);
            }

            var query = _query || {};
            myClass.storage.count(myClass, query, callback);
        }
    }

    if (typeof myClass.crud.update == 'undefined')
    {
        myClass.crud.update = function(_query, setter, authorization, callback)
        {
            if (arguments.length === 3)
            {
                callback = authorization;
                authorization = null;
            }

            // TODO: throw here as query is required for update.
            var query = _query;
            var denySetterKeys = [];
            var denyViewKeys = [];
            if (authorization)
            {
                if (authorization.isAccessDenied("update"))
                {
                    return callback("You do not have permission to update this item.", null);
                }
                query = authorization.applyQueryFilters("update", query);
            }

            myClass.crud.getOne(query, {}, function(err, original) {
                //var setter = req.body;
                if (err)
                {
                    return callback(err, null);
                }

                if (!original)
                {
                    // MWARDLE
                    // TODO: map this to a standard error type
                    return callback("Could not find the item. It may not exist, or you may not have permission to update it.", null)
                }

                if (authorization)
                {
                    if (authorization.isAccessDenied("update"))
                    {
                        return callback("You do not have permission to update this item.", null);
                    }
                    original[Schema._authorization] = authorization;
                    denySetterKeys = authorization.getDeniedKeys(Object.keys(setter), "update", original);
                    denyViewKeys = authorization.getDeniedKeys(Object.keys(setter), "view", original);
                }

                denySetterKeys.forEach(function(key){
                    delete setter[key];
                });

                for (var key in setter)
                {
                    original[key] = setter[key];
                }

                myClass.emit(['beforeUpdate', 'beforeSave'], original, function(err)
                {
                    if (err)
                    {
                        return callback(err, null);
                    }

                    try
                    {
                        myClass.schema.prepareInstance(original);
                    }
                    catch (e)
                    {
                        return callback(e, null);
                    }

                    setter = original.getChangedValues();

                    // Debug.log('SETTER: ', setter);
                    // Debug.log('ORIGINAL: ', original.toJSON());

                    if (myClass.timestamps !== false)
                    {
                        setter.modifiedTime = new Date().getTime();
                        if (myClass.schema.props.modifiedTime.meta.type == 'datetime')
                        {
                            setter.modifiedTime = new Date();
                        }
                    }

                    // TODO change query to use original's id
                    // so that we know we are limiting it to one
                    myClass.storage.update(myClass, original, query, setter, function(err, result) {
                        if (result != null && !(result instanceof myClass))
                        {
                            result = new myClass(result);
                        }

                        if (err || result == null)
                        {
                            return callback(err, null);
                        }

                        result[Schema._authorization] = authorization;

                        // make sure temporary values are reattached to
                        var originalKeys = new Set(Object.keys(original));
                        var newKeys = new Set(Object.keys(result));

                        for (let key of originalKeys) {
                            if (!newKeys.has(key)) {
                                result[key] = original[key];
                            }
                        }

                        myClass.emit(["afterUpdate", "afterSave"], result, true, function(errors)
                        {
                            if (Array.isArray(errors) && errors.length)
                            {
                                // DONT RETURN AN ERROR ON AN AFTER UPDATE
                                // SINCE THE CALLER MAY THINK THE UPDATE
                                // DID NOT HAPPEN
                                Debug.warn('after update called back with error', errors);
                            }

                            denyViewKeys.forEach(function(key){
                                result[Schema._hidekeys].add(key);
                            });

                            callback(null, result);
                        });
                    });
                });
            });
        }
    }

    if (typeof myClass.crud.delete == 'undefined')
    {
        myClass.crud.delete = function(_query, authorization, callback)
        {
            if (arguments.length === 2)
            {
                callback = authorization;
                authorization = null;
            }

            var query = _query;
            var denyViewKeys = [];
            if (authorization)
            {
                if (authorization.isAccessDenied("delete"))
                {
                    return callback("You do not have permission to delete this item.", null);
                }
                query = authorization.applyQueryFilters("delete", query);
            }

            myClass.crud.getOne(query, {}, function(err, original)
            {
                if (err)
                {
                    return callback(err, null);
                }

                if (!original)
                {
                    // MWARDLE
                    // TODO: map this to a standard error type
                    return callback("Could not find the item. It may not exist, or you may not have permission to delete it.", null);
                }

                // TODO: is this check necessary??
                if (authorization)
                {
                    if (authorization.isAccessDenied("delete", original))
                    {
                        return callback("You do not have permission to delete this item.", null);
                    }

                    original[Schema._authorization] = authorization;
                }

                myClass.emit('beforeDelete', original, function(err)
                {
                    if (err)
                    {
                        return callback(err, original);
                    }

                    myClass.storage.delete(myClass, original, query, function(err, result)
                    {
                        if (result == null)
                        {
                            result = original;
                        }

                        if (result != null && !(result instanceof myClass))
                        {
                            result = new myClass(result);
                        }

                        result[Schema._authorization] = authorization;

                        if (err)
                        {
                            return callback(err, result);
                        }

                        if (myClass.timestamps !== false)
                        {
                            result.deletedTime = new Date().getTime();
                        }

                        // make sure temporary values are reattached to
                        var originalKeys = new Set(Object.keys(original));
                        var newKeys = new Set(Object.keys(result));

                        for (let key of originalKeys) {
                            if (!newKeys.has(key)) {
                                result[key] = original[key];
                            }
                        }

                        myClass.emit('afterDelete', result, true, function(errors)
                        {
                            // DONT FAIL HERE!
                            if (Array.isArray(errors) && errors.length)
                            {
                                Debug.warn('Error returned from after delete hook', errors);
                            }

                            if (result)
                            {
                                if (authorization)
                                {
                                    denyViewKeys = authorization.getDeniedKeys(Object.keys(result), "view");
                                }
                                denyViewKeys.forEach(function(key){
                                    result[Schema._hidekeys].add(key);
                                });
                            }


                            if (myClass.saveTrash !== false && typeof myClass.storage.saveTrash === 'function')
                            {
                                var expireAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30 * 6);

                                myClass.storage.saveTrash(myClass, result, expireAt, function(err, expireResult)
                                {
                                    // DONT FAIL HERE!
                                    // TODO: consider returning a warning of some kind...
                                    if (err)
                                    {
                                        Debug.warn("Error returned when saving deleted object in trash", err);
                                    }

                                    callback(null, result);
                                });
                            }
                            else
                            {
                                callback(null, result);
                            }

                        });
                    });
                });
            })
        }
    }

    if (typeof myClass.crud.deleteMany == 'undefined')
    {
        myClass.crud.deleteMany = function(_query, authorization, callback)
        {
            if (arguments.length === 2)
            {
                callback = authorization;
                authorization = null;
            }

            var query = _query;
            var denyViewKeys = [];
            if (authorization)
            {
                if (authorization.isAccessDenied("delete"))
                {
                    return callback("You do not have permission to delete these items.", null);
                }
                query = authorization.applyQueryFilters("delete", query);
            }

            myClass.crud.get(query, {}, function(err, originals)
            {
                if (err)
                {
                    return callback(err, null);
                }

                if (!originals)
                {
                    // MWARDLE
                    // TODO: map this to a standard error type
                    return callback("Could not find the items. They may not exist, or you may not have permission to delete it.", null);
                }

                // TODO: is this check necessary??
                if (authorization)
                {
                    for (let i = 0; i < originals.length; i++)
                    {
                        if (authorization.isAccessDenied("delete", originals[i]))
                        {
                            return callback("You do not have permission to delete one or more items.", null);
                        }

                        originals[i][Schema._authorization] = authorization;
                    }
                }

                function beforeDeleteIter(index)
                {
                    if (index >= originals.length)
                    {
                        return doDelete();
                    }

                    myClass.emit('beforeDelete', originals[index], function(err)
                    {
                        if (err)
                        {
                            return callback(err, original);
                        }

                        process.nextTick(beforeDeleteIter, index + 1);
                    });
                }

                function doDelete()
                {
                    myClass.storage.deleteMany(myClass, originals, query, function(err, results)
                    {
                        if (results == null)
                        {
                            results = originals;
                        }

                        if (Array.isArray(results))
                        {
                            results = results.map((result) => {
                                if (result != null && !(result instanceof myClass))
                                {
                                    result = new myClass(result);
                                }
                                result[Schema._authorization] = authorization;
                                if (myClass.timestamps !== false)
                                {
                                    result.deletedTime = new Date().getTime();
                                }
                                if (authorization)
                                {
                                    denyViewKeys = authorization.getDeniedKeys(Object.keys(result), "view");
                                }
                                denyViewKeys.forEach(function(key){
                                    result[Schema._hidekeys].add(key);
                                });

                                return result;
                            });
                        }

                        if (err)
                        {
                            return callback(err, results);
                        }

                        originals = results;
                        afterDeleteIter(0);
                    });
                }

                function afterDeleteIter(index)
                {
                    if (index >= originals.length)
                    {
                        if (myClass.saveTrash !== false && typeof myClass.storage.saveTrash === 'function')
                        {
                            process.nextTick(saveTrashIter, 0);
                        }

                        // callback early
                        return callback(null, originals);
                    }

                    myClass.emit('afterDelete', originals[index], function(err)
                    {
                        if (err)
                        {
                            Debug.warn('Error returned from after delete hook', errors);
                        }

                        process.nextTick(afterDeleteIter, index + 1);
                    });
                }

                function saveTrashIter(index)
                {
                    // WE HAVE ALREADY CALLED BACK BY THE TIME WE HAVE REACHED THIS FUNCTION
                    if (index < originals.length)
                    {
                        var expireAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30 * 6);

                        myClass.storage.saveTrash(myClass, originals[index], expireAt, function(err, expireResult)
                        {
                            // DONT FAIL HERE!
                            // TODO: consider returning a warning of some kind...
                            if (err)
                            {
                                Debug.warn("Error returned when saving deleted object in trash", err);
                            }

                            process.nextTick(saveTrashIter, index + 1);
                        });
                    }
                }

                beforeDeleteIter(0);
            });
        }
    }

    if (typeof myClass.crud.create == 'undefined')
    {
        myClass.crud.create = function(_setter, authorization, callback)
        {
            if (arguments.length === 2)
            {
                callback = authorization;
                authorization = null;
            }

            var setter = {};
            var authorizedSetter = {};
            if (authorization)
            {
                authorizedSetter = authorization.getCreateDefaultValues();
                for (var key in authorizedSetter)
                {
                    if (typeof _setter[key] === "undefined")
                    {
                        _setter[key] = authorizedSetter[key];
                    }
                }
            }

            _setter = new myClass(_setter);
            var denyCreateKeys = [];
            var denyViewKeys = [];
            if (authorization)
            {
                if (authorization.isAccessDenied("create", _setter))
                {
                    return callback("You do not have permission to create this item.", null);
                }
                denyCreateKeys = authorization.getDeniedKeys(Object.keys(_setter), "create", _setter);
            }

            Object.keys(_setter).forEach(function(key)
            {
                if (_setter.hasOwnProperty(key) && typeof key !== 'function' && denyCreateKeys.indexOf(key) === -1)
                {
                    setter[key] = _setter[key]
                }
                else if (typeof authorizedSetter[key] !== 'undefined')
                {
                    setter[key] = authorizedSetter[key]
                }
            });

            if (Object.keys(setter).length === 0)
            {
                return callback("You do not have permission to create this item.", null);
            }

            var object = new myClass(setter);

            object[Schema._authorization] = authorization;

            if (myClass.timestamps !== false)
            {
                var currTime = new Date().getTime();
                object.createdTime = currTime;
                object.modifiedTime = currTime;

                if (myClass.schema.props.createdTime.meta.type == 'datetime')
                {
                    object.createdTime = new Date();
                }
                if (myClass.schema.props.modifiedTime.meta.type == 'datetime')
                {
                    object.modifiedTime = new Date();
                }
            }

            myClass.emit(['beforeCreate', 'beforeSave'], object, function(err)
            {
                if (err)
                {
                    return callback(err, null)
                }

                try
                {
                    myClass.schema.prepareInstance(object)
                }
                catch (e)
                {
                    return callback(e, null);
                }

                // filter out keys that do not belong
                var insert = object._getData();

                myClass.storage.create(myClass, insert, function(err, result)
                {
                    if (err)
                    {
                        return callback(err, null);
                    }

                    if (result == null)
                    {
                        return callback(null, object);
                    }

                    if (!(result instanceof myClass))
                    {
                        result = new myClass(result);
                    }

                    result[Schema._authorization] = authorization;

                    // make sure temporary values are reattached to
                    var originalKeys = new Set(Object.keys(object));
                    var newKeys = new Set(Object.keys(result));

                    for (let key of originalKeys) {
                        if (!newKeys.has(key)) {
                            result[key] = object[key];
                        }
                    }

                    myClass.emit(['afterCreate', 'afterSave'], result, true, function(errors)
                    {
                        // DONT FAIL HERE
                        if (Array.isArray(errors) && errors.length)
                        {
                            Debug.warn('Error returned from afterCreate hook ', err);
                        }

                        if(authorization)
                        {
                            denyViewKeys = authorization.getDeniedKeys(Object.keys(result), "view", result);
                        }

                        denyViewKeys.forEach(function(key){
                            result[Schema._hidekeys].add(key);
                        });

                        callback(null, result);
                    });
                });
            });
        }
    }

    if (typeof myClass.crud.clone === "undefined" && myClass.cloneable)
    {
        myClass.crud.clone = function(original, setter, options, authorization, callback)
        {
            const app = require_robinbase("app");
            if (arguments.length === 4)
            {
                callback = authorization;
                authorization = null;
            }
            else if (arguments.length == 3)
            {
                callback = options;
                authorization = null;
                options = {};
            }

            const creates = {};
            const cloneMap = {};

            function prepareClone(original, setter, thisClass, callback)
            {
                const originalId = original[thisClass.schema.useId];
                const newInstance = new thisClass(original._getData());
                // original = ;

                newInstance[thisClass.schema.useId] = thisClass.schema.generateId();
                // cloneMap[thisClass.modelKey] = cloneMap[thisClass.modelKey] || {};
                // cloneMap[thisClass.modelKey][originalId] = newInstance;

                Object.keys(setter).forEach(function(key)
                {
                    newInstance[key] = setter[key];
                });

                thisClass.emit(["beforeClone"], newInstance, function(err)
                {
                    if (err)
                    {
                        callback(err);
                        return;
                    }

                    creates[thisClass.modelKey] = creates[thisClass.modelKey] || [];
                    creates[thisClass.modelKey].push(newInstance);

                    if (typeof thisClass.joins === "object" && thisClass.joins != null)
                    {
                        const joinKeys = Object.keys(thisClass.joins)/*.filter(function(key)
                        {
                            // console.log('CLONE SETTER!!', thisClass.joins[key].cloneSetter);
                            return thisClass.joins[key].cloneSetter != null && typeof thisClass.joins[key].cloneSetter === "object";
                        });*/

                        // Debug.log('JOIN KEYS: ', joinKeys);

                        // TODO: make parallel
                        function joinIter(idx)
                        {
                            if (idx >= joinKeys.length)
                            {
                                callback(null, newInstance);
                                return;
                            }

                            const joinKey = joinKeys[idx];

                            const joinDef = thisClass.joins[joinKey];


                            if (!joinDef || !joinDef.cloneSetter)
                            {
                                // TODO: warn
                                joinIter(idx + 1);
                                return;
                            }

                            const joinCloneSetter = joinDef.cloneSetter;

                            const query = {};
                            query[joinDef.foreignKey] = original[joinDef.localKey];


                            const joinedClass = app.models[joinDef.collection];

                            if (!joinedClass)
                            {
                                // Debug.warn('NO JOIN CLASS OR JOIN CLONE SETTER', joinKey, joinDef, joinCloneSetter);
                                joinIter(idx + 1);
                                return;
                            }

                            const joinedCollection = joinDef.collection;
                            const joinedAuthorization = authorization && authorization.parent ? authorization.parent.getAuthorization(joinedCollection) : null;
                            const joinedSetter = {};
                            Object.keys(joinCloneSetter).forEach(function(setKey)
                            {
                                let value = joinCloneSetter[setKey];
                                if (typeof value === "string" && value[0] === "$")
                                {
                                    value = newInstance[value.substr(1)];
                                }

                                joinedSetter[setKey] = value;
                            });

                            joinedClass.crud.get(query, {}, joinedAuthorization, function(err, joinedRecords)
                            {
                                if (err)
                                {
                                    callback(err);
                                    return;
                                }

                                // TODO: make parallel
                                function addCreatesIter(addCreatesIndex)
                                {
                                    if (addCreatesIndex >= joinedRecords.length)
                                    {
                                        joinIter(idx + 1);
                                        return;
                                    }

                                    prepareClone(joinedRecords[addCreatesIndex], Object.assign({},joinedSetter), joinedClass, function(err)
                                    {
                                        if (err)
                                        {
                                            callback(err);
                                            return;
                                        }

                                        addCreatesIter(addCreatesIndex + 1);
                                    });
                                }

                                addCreatesIter(0);
                            });
                        }

                        joinIter(0);
                    }
                    else
                    {
                        callback(null, newInstance);
                    }
                });


            }



            prepareClone(original, setter, myClass, function(error, newInstance)
            {
                if (error)
                {
                    callback(error);
                    return;
                }


                // return callback(new Error('couldnt do it'));

                const insertModelKeys = Object.keys(creates);

                function insertModelsIter(insertModelsIndex)
                {
                    if (insertModelsIndex >= insertModelKeys.length)
                    {
                        callback(null, newInstance);
                        return;
                    }

                    const modelKey = insertModelKeys[insertModelsIndex];
                    const createClass = app.models[modelKey];
                    const createAuthorization = authorization && authorization.parent ? authorization.parent.getAuthorization(modelKey) : null;
                    const thisInserts = creates[modelKey];

                    // Debug.log('MODEL KEY: ', modelKey);
                    // Debug.log('THIS INSERTS: ', thisInserts);

                    // TODO: make parallel
                    function insertIter(insertIndex)
                    {
                        if (insertIndex >= thisInserts.length)
                        {
                            insertModelsIter(insertModelsIndex + 1);
                            return;
                        }

                        createClass.crud.create(thisInserts[insertIndex], createAuthorization, function(err, result)
                        {
                            if (err)
                            {
                                callback(err);
                                return;
                            }

                            myClass.emit(["afterClone"], result, function(err)
                            {
                                if (err)
                                {
                                    Debug.warn("after clone called back with error", err);
                                }

                                insertIter(insertIndex + 1);
                            });
                        });
                    }

                    insertIter(0);
                }

                insertModelsIter(0);
            });
        };
    }

    myClass.crud.withAuthorization = function(authorization)
    {
        return {
            get: function(_query, _options, callback) {
                if (arguments.length === 2)
                {
                    callback = _options;
                    _options = {};
                }
                return myClass.crud.get(_query, _options, authorization, callback);
            },
            getOne: function(_query, _options, callback) {
                if (arguments.length === 2)
                {
                    callback = _options;
                    _options = {};
                }
                return myClass.crud.getOne(_query, _options, authorization, callback);
            },
            count: function(_query, callback) {
                return myClass.crud.count(_query, authorization, callback);
            },
            update: function(_query, setter, callback) {
                return myClass.crud.update(_query, setter, authorization, callback);
            },
            "delete": function(_query, callback) {
                return myClass.crud.delete(_query, authorization, callback);
            },
            create: function(_setter, callback) {
                return myClass.crud.create(_setter, authorization, callback);
            }
        }
    }
}

module.exports = Crud;
