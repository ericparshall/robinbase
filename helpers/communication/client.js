(function() {
    var request = require('request');
    var https = require('https');
    var Config = require('../../config.js');
    var typeis = require('type-is');
    var xml2js = require('xml2js');
    var xmlParser = new xml2js.Parser({
        mergeAttrs: false,
        async: true,
        normalizeTags: false,
        normalize: true,
        explicitArray: false,
        attrkey:'_attr'
    });
    var csvParser = require('csv-parse');

    var _ = require('lodash');
    var formurlencoded = require('form-urlencoded');

    const urllib = require('url');
    const qs = require('qs');

    var Client = function Client(baseUrl)
    {
        var client = this;
        baseUrl = baseUrl || Config.RB_API_LINK;

        // Enables calls to be multipart (has files)
        var isMultiPart = false;

        //override cache to on for all queries
        var cacheQueries = false;
        client.endpoint = Config.RB_API_LINK;

        client.call = function call(path, args, callback, _method, _headers)
        {
            var headers = {};
            if (_headers)
            {
                headers = _headers;
                delete args._headers;
            }
            else if (args._headers)
            {
                headers = args._headers;
                delete args._headers;
            }

            var method = _method || 'get';
            var data;
            if (isMultiPart && arguments.length === 4)
            {
                var key;
                for (key in args) {
                    if (args.hasOwnProperty(key)) {
                        args[key] = typeof args[key] === 'object' ? formurlencoded(args[key]) : args[key];
                    }
                }

                var formData = callback;
                callback = arguments[3];
                for (key in formData) {
                    if (formData.hasOwnProperty(key)) {
                        args[key] = formData[key];
                    }
                }

                data = {formData: args};
            }
            else
            {
                data = isMultiPart ? {formData: args} : {form: args};
            }

            function runQuery(uniqueQueryId)
            {
                var useUrl = baseUrl + '/' + path;

                Debug.debug('req headers', headers);

                if (headers['content-type'] == 'application/json' || (typeof headers['content-type'] === 'string' && headers['content-type'].indexOf('+json') > -1))
                {
                    data = {};
                    data.headers = headers;
                    data.json = true;
                    data.body = args;
                }
                else if (typeof headers['content-type'] == 'string' && headers['content-type'] != 'application/x-www-form-urlencoded')
                {
                    data = {};
                    data.headers = headers;
                    data.body = args;

                    if (typeof data.body === 'object')
                    {
                        try
                        {
                            data.body = JSON.stringify(data.body);
                        }
                        catch (e)
                        {
                            data.body = '';
                        }
                    }

                    if (typeof data.body !== 'string' && !(data.body instanceof Buffer))
                    {
                        data.body = ''; // prevent a crash
                    }
                }
                else
                {
                    data.url = useUrl;
                    data.headers = headers;
                }

                // don't send a body on a get request
                if (_method === 'get' || _method === 'head')
                {
                    data.body = '';
                    data.json = false;

                    if (args != null && typeof args === 'object')
                    {
                        // add it to the query
                        const parsedUrl = urllib.parse(useUrl);

                        parsedUrl.query = Object.assign({}, qs.parse(parsedUrl.query), args);

                        useUrl = urllib.format(parsedUrl);
                    }
                }

                Debug.debug('data', data);

                request[method](useUrl, data, function(err, res, buffer) {
                    if (err != null)
                    {
                        callback(err.message, null, 504);
                        return;
                    }
                    var body = null;
                    if (typeof buffer == 'string')
                    {
                        Debug.log('RES: ', res.headers);

                        var type = typeis(res, ['json', 'xml', 'csv', '*/*+xml', '*/xml', '*/*+json', 'application/octet-stream']) || 'json';// default to json to be consistent with old behavior

                        Debug.debug('Request type: ', type);

                        if (type.indexOf('json') != -1)
                        {
                            try
                            {
                                body = JSON.parse(buffer);
                            }
                            catch (e)
                            {
                                //try to stringify because maybe it's sending over an object response...
                                Debug.log('buffer', buffer);
                                callback('Could not parse call response as JSON', null, res.statusCode, res.headers);
                                return;
                            }
                            Debug.debug('JSON DATA: ', body);

                        }
                        else if (type.indexOf('xml') != -1)
                        {
                            Debug.debug('parsing xml');
                            xmlParser.parseString(buffer, function(err, data) {
                                body = data;
                                if (err)
                                {
                                    console.log('buffer', buffer);
                                    return callback('Could not parse call response as xml: ' + err.message, null, res.statusCode, res.headers);
                                }
                                Debug.debug('XML DATA: ', body);

                                respond();
                            });

                            return;
                        }
                        else if (type.indexOf('csv') != -1)
                        {
                            body = csvParser(buffer, {
                                columns: true,
                                trim: true,
                            }, function(err, data) {
                                body = data;
                                if (err)
                                {
                                    Debug.debug('buffer', buffer);
                                    return callback('Could not parse call response as csv', null);
                                }
                                Debug.debug('CSV DATA: ', body);

                                respond();
                            });

                            return;
                        }
                        else
                        {
                            body = buffer;
                        }
                    }
                    else
                    {
                        body = buffer;
                    }

                    function respond()
                    {
                        if (callback != null)
                        {
                            if (res.statusCode < 200 || res.statusCode > 299)
                            {
                                callback(body, null, res.statusCode, res.headers);
                                return;
                            }
                            callback(null, body, res.statusCode, res.headers);
                        }
                    }

                    respond();


                });
            }

            runQuery();
        };

        client.call.post = function (path, args, callback, _headers)
        {
            client.call(path, args, callback, 'post', _headers);
        };

        client.call.get = function (path, args, callback, _headers)
        {
            client.call(path, args, callback, 'get', _headers);
        };

        client.call.delete = function (path, args, callback, _headers)
        {
            client.call(path, args, callback, 'delete', _headers);
        };

        client.call.patch = function (path, args, callback, _headers)
        {
            client.call(path, args, callback, 'patch', _headers);
        };

        client.call.put = function (path, args, callback, _headers)
        {
            client.call(path, args, callback, 'put', _headers);
        };

        client.call.multipart = function (path, args, callback, _method, _headers) {
            isMultiPart = true;
            client.call.apply(client, arguments);
            isMultiPart = false;
        };

        client.call.multipart.post = function(path, args, callback, _headers)
        {
            client.call.multipart(path, args, callback, 'post', _headers);
        };

        client.call.multipart.put = function(path, args, callback, _headers)
        {
            client.call.mulipart(path, args, callback, 'put', _headers);
        };

        client.call.multipart.patch = function(path, args, callback, _headers)
        {
            client.call.mulipart(path, args, callback, 'patch', _headers);
        };


    };

    var client = new Client();

    client.withEndpoint = function(endpoint)
    {
        return new Client(endpoint);
    };

    module.exports = client;

}).call();
