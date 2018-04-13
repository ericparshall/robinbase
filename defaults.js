var extensionDefaults = {};
var environmentCompilers = [];

var Defaults = function Defaults()
{
    var self = this;
    self.RB_PROJECT_TITLE = 'Application';
    self.RB_FILE_PATH = './'; //filePath
    self.RB_WEB_HOST = '127.0.0.1'; //webHost
    self.RB_API_HOST = '127.0.0.1'; //apiHost
    self.RB_ADMIN_HOST = '127.0.0.1';
    self.RB_WEB_PORT = 8080; //webPort
    self.RB_API_PORT = 3000; //apiPort
    self.RB_ADMIN_PORT = 8081; //adminPort
    self.RB_PUBLIC_DOMAIN = ''; //publicDomain
    self.RB_SECURE_COOKIE = false;  //secureCookie //must be false when testing the website without an SSL cert.
    self.RB_PROTOCOL = 'http'; //protocol
    self.RB_FILE_PATH = './';  //filePath
    self.RB_FROM_EMAIL = 'info@robinsage.com'; //infoEmail
    self.RB_PRIMARY_AUTH = 'users'; //primaryAuth
    self.RB_COLOR_PRIMARY = '#134471';
    self.RB_COLOR_SECONDARY = '#B4D5F0';
    self.RB_PAGE_SIZE = 50;
    self.RB_TMPDIR = './tmp';
    self.RB_SIDERBAR_ORDER = [];


    Object.assign(self, extensionDefaults);
}

Defaults.addExtensionDefaults = function addExtensionDefaults(newDefaults)
{
    Object.assign(extensionDefaults, newDefaults);
}

Defaults.addEnvironmentCompiler = function addEnvironmentCompiler(fn)
{
    environmentCompilers.push(fn);
}

Defaults.compileEnvironment = function compileEnvironment(config)
{
    var useEnv = Object.assign({}, process.env);
    delete useEnv.storages;
    delete useEnv.adminModels;
    delete useEnv.allModels;
    delete useEnv.startUp;
    delete useEnv.crash;

    Object.assign(config, useEnv);

    if (typeof config.RB_PRIMARY_AUTH === "string" && config.RB_PRIMARY_AUTH !== '__noauth__')
    {
        config.RB_PRIMARY_AUTH = config.RB_PRIMARY_AUTH.split(',').map(function(s){return s.trim()});
    }

    if (typeof config.RB_SIDEBAR_ORDER === 'string')
    {
        config.RB_SIDEBAR_ORDER = config.RB_SIDEBAR_ORDER.split(',');
    }

    if (typeof config.RB_SIDEBAR_EXCLUDE === 'string')
    {
        config.RB_SIDEBAR_EXCLUDE = config.RB_SIDEBAR_EXCLUDE.split(',');
    }

    environmentCompilers.forEach(function(fn)
    {
        fn(config);
    });
}

Defaults.parseModelString = function(input, defaultValue, dir)
{
    //todo fix this function or remove this design pattern...
    var parsed = querystring.parse(input);
    var out = {};
    if (!parsed)
    {
        return defaultValue;
    }
    for (var key in parsed)
    {
        var useDir = dir;
        if (key == '')
        {
            continue;
        }
        if (key.search(/^\$/) != -1)
        {
            key = key.replace(/^\$/, '');
            var useDir = '.';
        }
        out[key] = require_robinbase('model:'+parsed[key]);
    }

    return out;
}

Defaults.compileServices = function (config)
{

}


module.exports = Defaults;