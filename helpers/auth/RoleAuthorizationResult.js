var _ = require('lodash');
var Debug = require('../Debug').prefix('Authorization Result');

var AuthorizationResult = function AuthorizationResult(modelKey, data, schema)
{
    var self = this;

    self.modelKey = modelKey;
    self.data = data;

    // allow all by default
    self.policies = {
        create: [{
            type: 'Allow',
            conditions: [],
            keys: []
        }],
        view: [{
            type: 'Allow',
            conditions: [],
            keys: []
        }],
        update: [{
            type: 'Allow',
            conditions: [],
            keys: []
        }],
        "delete": [{
            type: 'Allow',
            conditions: [],
            keys: []
        }],
        "export": [{
            type: 'Allow',
            conditions: [],
            keys: []
        }]
    }

    self.schema = schema;
    self.parent = null;
}

/**
 * Used internally to process a single policy
 *
 * @param policy
 */
AuthorizationResult.prototype.processPolicy = function(policy) {
    var self = this;

    var type = policy.type;
    var models = policy.models;
    var actions = policy.actions;
    var conditions = policy.conditions;
    var keys = policy.keys;

    // we only care about policies that apply to the resource in question
    if (models.indexOf(self.modelKey) === -1 && models.indexOf('*') === -1)
    {
        return;
    }

    if (actions.indexOf('*') > -1)
    {
        actions = ["view", "update", "create", "delete"];
    }

    // if there is a policy that grants access to the resource
    // for the role, no matter what the conditions, we do not
    // totally deny access to the resource
    actions.forEach(function(action)
    {
        if (type === "Deny" && conditions.length === 0 && keys.length === 0)
        {
            // this is a deny all, remove policies and start over
            self.policies[action] = [];
        }
        else if (type === "Deny" && self.policies[action].length === 0)
        {
            // does nothing

        }
        else
        {
            self.policies[action].push({
                type: type,
                conditions: conditions,
                keys: keys
            });
        }

    });
}

/**
 * Used internally to pre-process an array of policies
 *
 * @param policies
 * @returns {AuthorizationResult}
 */
AuthorizationResult.prototype.runProcess = function(policies) {
    var self = this;

    policies.forEach(function(policy){
        self.processPolicy(policy);
    });

    return self;
}

/**
 * Determines if a user is denied permission to perform an action on an
 * object or the collection as a whole.
 *
 * It is expected that this method will be called prior to taking further
 * action in processing a request.
 *
 * @param {string} action - one of "view", "create", "update", "delete"
 * @param {Model|null} object - the object being tested agains
 * @returns {boolean}
 */
AuthorizationResult.prototype.isAccessDenied = function(action, object) {
    var self = this;

    var policies = self.policies[action] || [];

    if (policies.length === 0)
    {
        return true;
    }
    else if (!object)
    {
        return false;
    }

    var i;
    var schema = object.constructor.schema || null;
    for (i = 0; i < policies.length; i++)
    {
        if (policies[i].type === "Allow" && self.conditionMatchesObject(policies[i].conditions, object))
        {
            return false;
        }
    }

    return true;
}

/**
 * Internal function to process a condition value
 *
 * @param {*} value
 * @param {string} property
 * @param {Schema} schema
 * @returns {*}
 */
AuthorizationResult.prototype.processValue = function(value, property, schema)
{
    var self = this;
    var data = self.data;
    schema = schema || self.schema;
    if (typeof value === "string")
    {
        if (value[0] === "$")
        {
            value = value.substr(1);
            value = _.get(data, value);
        }
        else if (value[0] === "\\" && value[1] === "$")
        {
            value = value.substr(1);
        }
    }

    if (schema && schema.props[property])
    {
        value = schema.props[property].set(value, null);
    }
    return value;
}

/**
 * Tests to see if a policy condition matches an object
 *
 * Intended for but not limited to internal use.
 *
 * The condition is an array of triples where the first index
 * is a property (may be pathed with ".") name of the object,
 * the second index is an operator ("eq", "ne", "in", "nin")
 * and the third index is a value to test agains.  The value may
 * be prefixed with a $ character to indicate that the value should
 * be read from the current authenticated user.
 *
 * The following are example triples:
 *
 *       // matches an object that has a role of "User"
 *      ["role", "eq", "User"]
 *
 *      // matches if the objects userId property is equal to the current user's id
 *      ["userId", "eq", "$_id"]
 *
 *      // matches an object if their manufacturer is not "apple" and not "dell"
 *      ["manufacturer", "nin", ["apple", "dell"]]
 *
 * @param {*[][]}   condition
 * @param {Model}      object
 * @returns {boolean}  true if the object matches false otherwise
 */
AuthorizationResult.prototype.conditionMatchesObject = function(conditions, object)
{
    var self = this;
    var schema = null;
    var userData = self.data;
    var triple, i, property, op, value, propertyValue;

    if (!object)
    {
        return false;
    }

    if (object && object.constructor && object.constructor.schema)
    {
        schema = object.constructor.schema;
    }

    // if conditions is empty, it always matches
    if (conditions.length === 0)
    {
        return true;
    }

    for (i = 0; i < conditions.length; i++)
    {
        triple = conditions[i];

        property = triple[0];
        op = triple[1];
        value = triple[2];
        propertyValue = _.get(object, property);


        if (typeof propertyValue === "undefined")
        {
            return false;
        }

        // valid ops are 'eq' 'ne' 'in' 'nin'
        switch(op)
        {
            case 'eq':
                value = self.processValue(value, property, schema);
                // stringify for objects like objectids
                if (String(propertyValue) !== String(value))
                {
                    return false;
                }
                break;
            case 'ne':
                value = self.processValue(value, property, schema);
                // stringify for objects like objectids
                if (String(propertyValue) === String(value))
                {
                    return false;
                }
                break;
            case 'in':
                if (typeof value === "string" && value[0] === "$")
                {
                    value = self.processValue(value)
                }
                if (!Array.isArray(value))
                {
                    // ignore it since it is invalid
                    continue;
                }
                value = value.map(function(v){
                    return String(self.processValue(v), property, schema);
                });

                if (value.indexOf(String(propertyValue)) === -1)
                {
                    return false;
                }
                break;
            case 'nin':
                if (typeof value === "string" && value[0] === "$")
                {
                    value = self.processValue(value)
                }
                if (!Array.isArray(value))
                {
                    // ignore it since it is invalid
                    continue;
                }
                value = value.map(function(v){
                    return String(self.processValue(v), property, schema);
                });

                if (value.indexOf(String(propertyValue)) !== -1)
                {
                    return false;
                }
                break;
            default:
            // ignore
        }
    }

    return true;
}

/**
 * Modifies a query according to the security policy
 *
 * @param {string} action - one of "view" "create" "update" "delete"
 * @param {object} query - the query object that will be modified
 * @param {Schema} schema - the schema for the object being queried for
 */
AuthorizationResult.prototype.applyQueryFilters = function(action, query, schema)
{
    // each condition is an and,
    // conditions are joined with or
    // if any condition is empty, we apply no filter
    // since they have access to everything

    // need to be careful here so that we don't make the queries
    // so complex that it slows down execution by the database

    // it is assumed that the isAccessDenied method has already
    // been called for the collection

    query = _.cloneDeep(query);
    var addToQuery = [];
    var self = this;

    var policies = self.policies[action] || [];
    var i, j, conditions, triple, query, property, op, value, nextQuery, type;
    var matchingAll = false;

    if (policies.length === 0)
    {
        throw new Error("Can not apply authorization query filter because access is denied.  Ensure that isAccessDenied is called before attempting to modify the query.");
    }

    for (i = 0; i < policies.length; i++)
    {
        policyQuery = [];
        conditions = policies[i].conditions;
        type = policies[i].type;

        if (type === 'Deny' && policies[i].keys.length > 0)
        {
            // this can not be added to the query
            // since it is only denying access to
            // specific keys
            continue;
        }

        if (conditions.length === 0)
        {
            // this has to be an allow because a non-conditional deny wipes out
            // all policies that preceded it (assuming it does not limit the keys)
            //
            // no conditions so match all unless a deny with a condition shows up later
            matchingAll = true;
            addToQuery = [];
            continue;
        }

        if (type === 'Deny')
        {
            matchingAll = false;
        }

        if (matchingAll)
        {
            // it is wrong to narrow the query here
            continue;
        }

        for (j = 0; j < conditions.length; j++)
        {
            triple = conditions[j];
            if (triple.length !== 3)
            {
                // ignore it
                break;
            }
            property = triple[0];
            op = triple[1];
            value = triple[2];
            nextQuery = null;

            if (type === 'Deny')
            {
                // the operator needs to be inverted
                switch(op)
                {
                    case 'eq':
                        op = 'ne';
                        break;
                    case 'ne':
                        op = 'eq';
                        break;
                    case 'in':
                        op = 'nin';
                        break;
                    case 'nin':
                        op = 'in';
                        break;
                }
            }

            switch(op)
            {
                case 'eq':
                    value = self.processValue(value, property, schema);
                    nextQuery = {
                        [property]: {
                            '$eq': value
                        }
                    };
                    break;
                case 'ne':
                    value = self.processValue(value, property, schema);
                    nextQuery = {
                        [property]: {
                            '$ne': value
                        }
                    };
                    break;
                case 'in':
                    if (typeof value === "string" && value[0] === "$")
                    {
                        value = self.processValue(value)
                    }
                    if (!Array.isArray(value))
                    {
                        // ignore it since it is invalid
                        continue;
                    }
                    value = value.map(function(v){
                        return self.processValue(v, property, schema);
                    });
                    nextQuery = {
                        [property]: {
                            '$in': value
                        }
                    };
                    break;
                case 'nin':
                    if (typeof value === "string" && value[0] === "$")
                    {
                        value = self.processValue(value)
                    }
                    if (!Array.isArray(value))
                    {
                        // ignore it since it is invalid
                        continue;
                    }
                    value = value.map(function(v){
                        return self.processValue(v, property, schema);
                    });
                    nextQuery = {
                        [property]: {
                            '$nin': value
                        }
                    };
                    break;
                default:
                    // ignore

            }

            if (nextQuery){
                policyQuery.push(nextQuery);
            }

        }

        if (policyQuery.length === 1)
        {
            addToQuery.push(policyQuery[0]);
        }
        else if(policyQuery.length > 1)
        {
            addToQuery.push({'$and': policyQuery})
        }
    }

    if (addToQuery.length === 0)
    {
        return query;
    }

    if (query['$and'])
    {
        query['$and'].push({
            '$or': addToQuery
        });
    }
    else
    {
        query["$and"] = [{
            '$or': addToQuery
        }]
    }

    return query;
}

/**
 * Gets all keys that should be denied for the object
 *
 * @param {string[]} keys - an array of keys to be tested for, either an instance's
 *                        keys for view or a setter for update / create
 *                        this method will only return values contained within this array
 * @param {string} action - one of "view" "create" "update" "delete"
 * @param {Model} object - the instance whose denied keys are being calculated
 * @returns {string[]} - an array of keys that should be denied
 */
AuthorizationResult.prototype.getDeniedKeys = function(keys, action, object)
{
    var self = this;
    var policies = self.policies[action] || [];
    var denied = keys.slice();

    var i, j, policy, conditions, allowed;
    for (i = 0; i < policies.length; i++)
    {
        policy = policies[i];
        conditions = policy.conditions;
        if (self.conditionMatchesObject(conditions, object))
        {
            if (policy.keys.length === 0)
            {
                // allow them all
                if (policy.type === "Deny")
                {
                    // deny all the keys
                    denied = keys.slice();
                }
                else
                {
                    // allow them all
                    denied = [];
                }
            }
            else if (policy.type === 'Deny')
            {
                policy.keys.forEach(function(k){
                    if (denied.indexOf(k) === -1) {
                        denied.push(k);
                    }
                });
            }
            else
            {
                denied = _.difference(denied, policy.keys);
            }
        }
        else if (!object && action === "export")
        {
            // this is used for the exporter
            //
            // special rules when object is not present
            // and the action is export
            //
            // for a deny, the condition is always assumed
            // to be true
            // for an allow, the conditions is always assumed
            // to be false, unless there are no conditions

            if (policy.keys.length === 0)
            {
                if (policy.type === "deny")
                {
                    // deny everything
                    denied = keys.slice();
                }
                else if (conditions.length === 0)
                {
                    // allow everything
                    denied = [];
                }
                // do not allow everything when there are conditions
            }
            else if (policy.type === "Deny")
            {
                policy.keys.forEach(function(k){
                    if (denied.indexOf(k) === -1) {
                        denied.push(k);
                    }
                });
            }
            else if (conditions.length === 0)
            {
                denied = _.difference(denied, policy.keys);
            }
            // do not allow keys when there are conditions
        }
    }

    return denied;
}

AuthorizationResult.prototype.getCreateDefaultValues = function()
{
    var defaults = {};
    var self = this;
    var policies = self.policies.create;
    var schema = self.schema;

    policies.forEach(function(policy)
    {
        if (policy.conditions.length)
        {
            if (policy.type === "Deny" && !policy.keys.length)
            {
                policy.conditions.forEach(function(condition)
                {
                    var value;
                    if (condition[1] === "neq")
                    {
                        value = self.processValue(condition[2], condition[0]);
                        defaults[condition[0]] = value;
                    }
                    else if (condition[2] === "nin")
                    {
                        var useValue = condition[2][0];
                        if (typeof useValue === "string" && useValue[0] === "$")
                        {
                            useValue = self.processValue(useValue[0]);
                        }
                        value = self.processValue(useValue[0], condition[0]);
                        defaults[condition[0]] = value;
                    }
                })
            }
            else if (policy.type === "Allow")
            {
                policy.conditions.forEach(function(condition)
                {
                    var value;
                    if (condition[1] === "eq")
                    {
                        value = self.processValue(condition[2], condition[0]);
                        defaults[condition[0]] = value;
                    }
                    else if (condition[2] === "in")
                    {
                        var useValue = condition[2][0];
                        if (typeof useValue === "string" && useValue[0] === "$")
                        {
                            useValue = self.processValue(useValue[0]);
                        }
                        value = self.processValue(useValue, condition[0]);
                        defaults[condition[0]] = value;
                    }
                })
            }
        }
    });

    return defaults;
}

// so that it can be loaded from a cache
AuthorizationResult.prototype.setPolicies = function(object)
{
    this.policies = object;
}

// so that it can be saved in a cache
AuthorizationResult.prototype.getPolicies = function()
{
    return this.policies;
}

AuthorizationResult.prototype.allowAll = function()
{
    var self = this;
    Object.keys(self.policies).forEach(function(action)
    {
        self.policies[action] = [{
            type: 'Allow',
            conditions: [],
            keys: []
        }];
    });

    return self;
}

AuthorizationResult.prototype.denyAll = function()
{
    var self = this;

    Object.keys(self.policies).forEach(function(action)
    {
        self.policies[action] = [];
    });

    return self;
}

AuthorizationResult.prototype.setParent = function(parent)
{
    // not enumerable to avoid recursiveness in logs etc...
    Object.defineProperty(this, 'parent', {
        value: parent,
        enumerable: false
    });
}

module.exports = AuthorizationResult;
