const express = require('express');

module.exports = function createModelBaseRouter(Model, route)
{
    const router = express.Router();
    const modelKey = Model.modelKey;
    const view = Model.view || {};
    // const route = view.route;
    if (!route)
    {
        return null;
    }

    router.use(`/${route}`, function(req, res, next)
    {
        res.locals.auth = {};
        res.locals.modelKey = modelKey;
        res.locals.modelPath = route;
        res.locals.view = view;
        res.locals.Model = Model;

        if (res.locals.authorizations)
        {
            res.locals.authorization = res.locals.authorizations[modelKey] || null;
        }

        next();
    });

    return router;
}