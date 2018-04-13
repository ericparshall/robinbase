/* This is here primarily to document the storage interface
   with a sample implementation that doesn't do anything */


var VoidStorage = function(options)
{

}


/**
 * The init function will be called when the application starts.
 *
 * It should initialize any required connections, etc that are required
 * for the storage to operate.
 *
 * @param callback
 */
VoidStorage.prototype.init = function(callback)
{
    // callback with an error if necessary
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
VoidStorage.prototype.prepareCollection = function(model, callback)
{
    model.storage = this;

    // callback with an error if necessary
    callback(null);
}

/**
 * Sanitize an id used for crud operations
 *
 * @param id
 * @returns {*}
 */
VoidStorage.prototype.prepareId = function(id)
{
    return id;
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
VoidStorage.prototype.get = function(collectionName, query, options, callback)
{
    callback(null, []);
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
VoidStorage.prototype.getOne = function(collectionName, query, options, callback)
{
    if (arguments.length === 3)
    {
        callback = options;
        options = {};
    }

    callback(null, null);
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
VoidStorage.prototype.count = function(collectionName, query, callback)
{
    callback(null, 0);
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
VoidStorage.prototype.update = function(collectionName, object, query, setter, callback)
{
    callback(null, object);
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
VoidStorage.prototype.delete = function(collectionName, object, query, callback)
{
    callback(null, object);
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
VoidStorage.prototype.saveTrash = function(collectionName, object, expireAt, callback)
{
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
VoidStorage.prototype.create = function(collectionName, record, callback)
{
    callback(null, record);
}

module.exports = VoidStorage;