var async = require('async');
var Debug = require('./Debug').prefix('Lets');

(function(){

    var Lets = function Lets()
    {
        var self = this;
        self.try = function(next, func)
        {
            return function()
            {
                try
                {
                    return func.apply(null, arguments);
                }
                catch (e)
                {
                    return next(e);
                }
            }
        }

        self.join = function(model, options, reqQ, context, authData)
        {
            if (typeof reqQ.join == 'string')
            {
                reqQ.join = [reqQ.join];
            }
            if (Array.isArray(reqQ.join))
            {
                options.joins = reqQ.join;
            }
            if (typeof options.joins == 'undefined')
            {
                options.joins = [];
            }

            if (model)
            {
                options.joins = options.joins.concat(model.getAutomaticJoins(context, authData));
            }

            // make sure items are unique
            options.joins = options.joins.reduce(function(result, join)
            {
                if (!result.includes(join))
                {
                    result.push(join);
                }

                return result;
            }, []);

            return options;
        }

        self.query = function(model, origQ, reqQ)
        {
            var protectedVars = ['sk', 'sd', 'vk', 'dk'];
            var operators = ['eq', 'lt', 'gt', 'gte', 'lte', 'ne', 'in', 'nin', 'near', 'within'];
            var logics = ['$or', '$and', '$not', '$nor'];


            function processNext(_reqQ)
            {
                var out = {};
                for (var key in _reqQ)
                {
                    if (protectedVars.indexOf(key) != -1)
                    {
                        continue;
                    }

                    if ((key == 'search') && (typeof _reqQ[key] == 'string') && _reqQ[key].length > 0)//special shorthand...
                    {
                        out['$text'] = {};
                        out['$text']['$search'] = _reqQ[key];

                        /*
                         db.articles.find(
                         { $text: { $search: "coffee" } },
                         { score: { $meta: "textScore" } }
                         ).sort( { score: { $meta: "textScore" } } )
                         */
                        //return out;
                    }

                    //value = model.schema.props[key].set(value, {});
                    if (typeof _reqQ[key] != 'object')
                    {
                        continue;
                    }

                    var qObj = {};

                    function processKeys(inObj, _key)
                    {
                        var oObj = {};
                        if (logics.indexOf(_key) != -1)
                        {
                            return processLogic(inObj, _key);
                        }
                        for (var qKey in inObj[_key])
                        {
                            if (operators.indexOf(qKey) == -1)
                            {
                                continue;
                            }
                            if (typeof model.schema.props[_key] == 'undefined')
                            {
                                continue;
                            }
                            if ((qKey == 'near') && (model.schema.props[_key].meta.type != 'location'))
                            {
                                continue;
                            }
                            if ((Array.isArray(inObj[_key][qKey])) && (qKey != 'near') && (qKey != 'within'))
                            {
                                oObj['$'+qKey] = [];
                                for (var i=0; i<inObj[_key][qKey].length; i++)
                                {
                                    oObj['$'+qKey][i] = model.schema.props[_key].set(inObj[_key][qKey][i], {});
                                }
                            }
                            else if (qKey == 'near')
                            {
                                //?location[near]=-111,40.3
                                //?location[near]=-110,40&location[max]=180000
                                var split = [];
                                var location = [];
                                if (typeof inObj[_key][qKey] == 'string')
                                {
                                    split = inObj[_key][qKey].split(',');
                                }
                                for (var i=0; i<split.length; i++)
                                {
                                    location.push(parseFloat(split[i]));
                                }

                                oObj['$'+qKey] = {
                                    '$geometry': {
                                        type: "Point",
                                        coordinates: model.schema.props[_key].set(location, {})
                                    }
                                }
                                if (typeof inObj[_key]['max'] != 'undefined')
                                {
                                    oObj['$'+qKey]['$maxDistance'] = parseFloat(inObj[_key]['max']);
                                }
                                if (typeof inObj[_key]['min'] != 'undefined')
                                {
                                    oObj['$'+qKey]['$minDistance'] = parseFloat(inObj[_key]['min']);
                                }

                                //disables sorting so that the distance can be the sort key.
                                if ((typeof reqQ.sk == 'undefined') && (typeof reqQ.sd == 'undefined'))
                                {
                                    reqQ.sk='-';
                                    reqQ.sd='-';
                                }
                            }
                            else if (qKey == 'within')
                            {
                                //?location[within][]=-112,39&location[within][]=-110,39&location[within][]=-110,41&location[within][]=-112,41&location[within][]=-112,39
                                var polygon = [];
                                for (var i=0; i<inObj[_key][qKey].length; i++)
                                {
                                    if (typeof inObj[_key][qKey][i] != 'string')
                                    {
                                        continue;
                                    }
                                    var split = inObj[_key][qKey][i].split(',');

                                    if (split.length != 2)
                                    {
                                        continue;
                                    }
                                    polygon.push([parseFloat(split[0]), parseFloat(split[1])]);
                                }

                                if (polygon.length > 1)
                                {
                                    polygon.push(polygon[0]);
                                }

                                oObj['$geoWithin'] = {
                                    '$geometry': {
                                        type: "Polygon",
                                        coordinates: [polygon]
                                    }
                                }
                            }
                            else
                            {
                                oObj['$'+qKey] = model.schema.props[_key].set(inObj[_key][qKey], {});
                            }

                        }
                        return oObj;
                    }

                    function processLogic(inObj, _key)
                    {
                        //inObj
                        //var logicObj = {};

                        var sets = [];
                        for (var i=0; i<inObj[_key].length; i++)
                        {
                            sets.push(processNext(inObj[_key][i]));
                        }

                        inObj[_key] = sets;

                        return inObj[_key];
                    }

                    qObj = processKeys(_reqQ, key);

                    if (Object.keys(qObj).length > 0)
                    {
                        out[key] = qObj;
                    }

                }
                return out;
            }

            return Object.assign(origQ, processNext(reqQ));
        }

        self.upload = function(uploader, files, dest, options, callback)
        {
            Debug.log('UPLOAD ARGS: ', arguments);
            options = options || [];

            if (uploader && files && Object.keys(files).length)
            {

                if (!Array.isArray(options) && options.type === 'any')
                {
                    async.mapValues(files, function(fileObj, index, innerCallback)
                    {
                        let optionObj = Object.assign({}, options, {
                            name: fileObj.fieldname,
                        });

                        uploader.upload(fileObj, optionObj, fileObj.fieldname, function(err, updates){
                            Object.assign(dest, updates);
                            innerCallback(err);
                        });
                    }, callback);
                }
                else
                {
                    async.mapValues(files, function(fileObjs, key, innerCallback)
                    {
                        let optionObj = {};
                        let i;



                        for (i = 0; i < options.length; i++)
                        {
                            if (options[i].name === key)
                            {
                                optionObj = options[i];
                                break;
                            }
                        }



                        uploader.upload(fileObjs[0], optionObj, key, function(err, updates){
                            Object.assign(dest, updates);
                            innerCallback(err);
                        });
                    }, callback)
                }


            }
            else
            {
                process.nextTick(callback, null);
            }
        }

        self.authorize = function(authData, callback) {
            var Config = require('../config.js');
            var AuthorizationTree = require('../helpers/auth/AuthorizationTree.js');

            if (Config.RB_PRIMARY_AUTH === '__noauth__')
            {
                // allow all actions for every model
                return callback(null, {});
            }

            var authModels = {};
            var allModels = Config.allModels;
            var allModelKeys = Object.keys(allModels);
            var authInfosToCheck = {};

            allModelKeys.forEach(function(key)
            {
                var model = allModels[key];
                var authenticatedBy = model.authenticatedBy || Config.RB_PRIMARY_AUTH;
                if (authenticatedBy === '__noauth__' || (Array.isArray(authenticatedBy) && authenticatedBy.length === 0))
                {
                    // allows everything
                    return;
                }

                authModels[key] = [key, authenticatedBy];

                if (Array.isArray(authenticatedBy))
                {
                    authenticatedBy.forEach(function(by)
                    {
                        authInfosToCheck[by] = by;
                    });
                }
                else
                {
                    authInfosToCheck[authenticatedBy] = authenticatedBy;
                }
            });

            var loggedIn = {};

            async.mapValues(authInfosToCheck, function(toCheck, key, callback)
            {
                if (typeof allModels[toCheck] === 'undefined')
                {
                    return callback('Can not authenticated with : ' + toCheck, null);
                }
                var auth = allModels[toCheck].auth;
                loggedIn[toCheck] = auth.isLoggedIn(authData[toCheck]);
                auth.check(authData[toCheck], function(err, data)
                {
                    if(err)
                    {
                        return callback(null, null);
                    }

                    auth.loadData(data, callback)
                    // callback(null, data);
                });
            }, function(err, authInfos)
            {
                async.mapValues(authModels, function(info, key, callback)
                {
                    var modelKey = info[0];
                    var authenticatedBy = info[1];

                    if (!Array.isArray(authenticatedBy))
                    {
                        authenticatedBy = [authenticatedBy];
                    }

                    var authorizeModel = allModels[authenticatedBy[0]];
                    var myAuthInfo = authInfos[authenticatedBy[0]];

                    for (var i = 0; i < authenticatedBy.length; i++)
                    {
                        if (loggedIn[authenticatedBy[i]])
                        {
                            authorizeModel = allModels[authenticatedBy[i]];
                            myAuthInfo = authInfos[authenticatedBy[i]];
                            break;
                        }
                    }

                    if (!myAuthInfo)
                    {
                        for (var i = 0; i < authenticatedBy.length; i++)
                        {
                            if (authInfos[authenticatedBy[i]])
                            {
                                authorizeModel = allModels[authenticatedBy[i]];
                                myAuthInfo = authInfos[authenticatedBy[i]];
                                break;
                            }
                        }
                    }

                    authorizeModel.auth.authorize(modelKey, myAuthInfo, authData[authenticatedBy], function(err, authorization)
                    {
                        if (err)
                        {
                            Debug.warn('Error loading authorization for model: ', modelKey, err);
                        }

                        callback(null, authorization || null);
                    });
                }, function(err, results)
                {
                    if (err)
                    {
                        return callback(err, null);
                    }

                    // allows authorizations to reference one another
                    // a class may not be necessary, but its here for convenience
                    var authorizationTree = new AuthorizationTree();
                    authorizationTree.addAll(results);

                    callback(err, results);
                });
            })
        }
    }

    module.exports = new Lets();
}).call(this);
