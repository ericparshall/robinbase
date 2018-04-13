var path = require('path');
var RobinbaseApp = require('./RobinbaseApp');

module.exports = function(appPath, run = true)
{
    app = new RobinbaseApp(appPath);
    app.setGlobals();
    app.loadExtensions(function()
    {
        app.loadConfig();
        var Debug = require('./helpers/Debug.js').handleCritical(function(err){
            //put any extreme error handling here.
            app.config.crash(Debug, app.config, err);
        });

        app.init(function() {
            if (run) {
                app.run();
            }
        });
    });
}
