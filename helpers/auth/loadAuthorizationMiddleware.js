var Lets = require('../Lets.js');
var Debug = require('../Debug').prefix('load authorization');

module.exports = function(Config)
{
    return function(req, res, next)
    {
        if (res.locals.authorizations)
        {
            // don't overwrite if already done
            return next();
        }

        var authData = {};
        var authKeys = Object.keys(Config.allModels).filter(function(key){
            return Config.allModels[key].auth != null;
        });

        if (res.locals.apiMode)
        {
            authKeys.forEach(function(key)
            {
                authData[key] = Object.assign({}, req.query, req.body);
            });
        }
        else
        {
            authData = req.session.auth || {};
        }

        Lets.authorize(authData, function(err, authorizations)
        {
            if (err) { return next(err); }

            res.locals.authorizations = authorizations;

            next();
        });
    }
}
