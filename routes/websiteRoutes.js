(function(){

    var express = require('express');
    var websiteRouter = express.Router();

    websiteRouter.get('/', function (req, res) {
        var processData = req.defaultProcessData();
        //return next();
        res.html('templates.empty', processData);
    });

    module.exports = websiteRouter;
}).call(this);