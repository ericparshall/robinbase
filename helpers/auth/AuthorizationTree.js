var Debug = require('../Debug').prefix('authorizationtree')

function AuthorizationTree()
{
    this.results = {};
}

AuthorizationTree.prototype.addAuthorization = function(key, result)
{
    // Debug.log('RESULT: ', result);
    this.results[key] = result;
    result.setParent(this);

    return this;
}

AuthorizationTree.prototype.getAuthorization = function(key)
{
    return this.results[key] || null;
}

AuthorizationTree.prototype.addAll = function(results)
{
    for (key in results)
    {
        this.addAuthorization(key, results[key]);
    }

    return this;
}

module.exports = AuthorizationTree;
