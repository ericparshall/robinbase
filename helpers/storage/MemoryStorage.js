/* This is here primarily to document the storage interface
 with a sample implementation that doesn't do anything */

var Debug = require('../Debug');

var MemoryStorage = function(options)
{
    this.collections = {};
}


/**
 * The init function will be called when the application starts.
 *
 * It should initialize any required connections, etc that are required
 * for the storage to operate.
 *
 * @param callback
 */
MemoryStorage.prototype.init = function(callback)
{
    // callback with an error if necessary
    Debug.log('Initialized memory storage');
    callback(null);
}

/**
 * Prepare collection class.
 *
 * The most important thing this function does is set the storage on the class.
 * It may also do things such as ensuring indexes if need be.
 *
 * @param model
 * @param callback
 */
MemoryStorage.prototype.prepareCollection = function(model, callback)
{
    model.storage = this;
    this.collections[model.collection] = [];

    // callback with an error if necessary
    callback(null);
}

/**
 * Sanitize an id used for crud operations
 *
 * @param id
 * @returns {*}
 */
MemoryStorage.prototype.prepareId = function(id)
{
    if (typeof id === 'number')
    {
        return id;
    }

    return parseInt(id);
}

/**
 * Fetch records based on a query.
 *
 * It should callback with an array of records.
 *
 * @param collectionName
 * @param query
 * @param options
 * @param callback
 */
MemoryStorage.prototype.get = function(collectionName, query, options, callback)
{
    var data = this.collections[collectionName].filter(function(item){
        for (var key in query) {
            if (item[key] !== query[key]) {
                return false;
            }
        }

        return true;
    }).sort(function(left, right){
        // this is a HORRIBLE sort and really doesn't work
        // for anything but numbers
        // but I'm in a hurry and this is mostly just
        // a demonstration, so whatevs
        var leftVal = left[options.sort[0]];
        var rightVal = right[options.sort[0]];
        if (options.sort[1] === 'desc') {
            return (leftVal - rightVal) || 0;
        } else {
            return (rightVal - leftVal) || 0;
        }
    }).slice(options.pageNum * options.count, (options.pageNum+1) * options.count);

    callback(null, data);
}

/**
 * Fetch a single record based on a query OR an id.
 *
 * It should callback with a single record or null if the record was not found.
 *
 * The options argument should be optional
 *
 * @param collectionName
 * @param query
 * @param options
 * @param callback
 */
MemoryStorage.prototype.getOne = function(collectionName, query, options, callback)
{
    if (arguments.length === 3)
    {
        callback = options;
        options = {};
    }

    if (typeof query === "string")
    {
        query = parseInt(query);
    }
    if (typeof query === 'number')
    {
        query = {id: query}
    }

    options.pageNum = 0;
    options.count = 1;
    options.sort = ['id', 'desc'];

    this.get(collectionName, query, options, function(err, result)
    {
        if (err)
        {
            // MWARDLE
            // TODO: map this to a standard error
            return callback(err, null);
        }

        if (result.length < 1)
        {
            callback (null, null);
        }

        callback(null, result[0]);
    });
}

/**
 * Counts items that match a query.
 *
 * It MUST call back with an integer that is greater than one.
 *
 * @param collectionName
 * @param query
 * @param callback
 */
MemoryStorage.prototype.count = function(collectionName, query, callback)
{
    if (typeof query === 'number')
    {
        query = {id: query};
    }
    var data = this.collections[collectionName];
    var count = data.reduce(function(accum, item){
        for (var key in query) {
            if (item[key] !== query[key]) {
                return accum;
            }
        }

        return accum + 1;
    }, 0);

    callback(null, count);
}

/**
 * Updates a SINGLE object in the storage.
 *
 * The function MUST call back with an updated record or the given
 * object value if that is not possible.
 *
 * The setter is a list of values that should be updated.
 * The object is a full representation of the item if the full item is required
 * for the update and as a possible return value if an updated record is not
 * convenient for the storage to return.
 *
 * Query may be an id or a query object.
 *
 * @param collectionName
 * @param query
 * @param fullObject
 * @param setter
 * @param callback
 */
MemoryStorage.prototype.update = function(collectionName, object, query, setter, callback)
{
    if (typeof query === 'number')
    {
        query = {id: query};
    }
    var data = this.collections[collectionName];
    var index = data.findIndex(function(item) {
        for (var key in query) {
            if (item[key] !== query[key]) {
                return false;
            }
        }

        return true;
    });

    if (index === -1) {
        return callback(new Error("Could not find the object"), null);
    }

    for (var key in setter)
    {
        data[index][key] = setter[key];
    }

    callback(null, data[index]);
}

/**
 * Deletes a SINGLE object in the storage.
 *
 * The function MUST call back with the original record.
 *
 * @param collectionName
 * @param object
 * @param query
 */
MemoryStorage.prototype.delete = function(collectionName, object, query, callback)
{

    var data = this.collections[collectionName];
    var index = data.findIndex(function(item) {
        for (var key in query) {
            if (item[key] !== query[key]) {
                return false;
            }
        }

        return true;
    });

    if (index === -1) {
        return callback(new Error("Could not find the object"), null);
    }

    var item = data[index];

    data = data.slice(0,index).concat(index+1);
    this.collections[collectionName] = data;

    callback(null, item);
}

/**
 * Saves a deleted object in the storages trash.
 *
 * The collection name will be the original collection name.
 *
 * @param collectionName
 * @param object
 * @param callback
 */
MemoryStorage.prototype.saveTrash = function(collectionName, object, expireAt, callback)
{
    // we don't do that here
    callback(null, object);
}


/**
 * Insert a SINGLE object in the storage.
 *
 * The function MUST call back with an updated version of the record
 * or with the original record if this is no updated version is convenient.
 *
 * @param collectionName
 * @param object
 * @param callback
 */
MemoryStorage.prototype.create = function(collectionName, record, callback)
{
    if (!record.id)
    {
        record.id = Math.floor(Math.random() * 10000000);
    }
    this.collections[collectionName].push(record);
    callback(null, record);
}

module.exports = MemoryStorage;