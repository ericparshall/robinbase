const _Debug =require('./helpers/Debug')
const Debug = _Debug.prefix('RobinbaseApp');
const nodepath = require('path');
const fs = require('fs');
const pluralize = require('pluralize');
const browserify = require('browserify');
const babelify = require('babelify');

const AsyncEventEmitter = require('./base-extension/service/communication/AsyncEventEmitter');

function RobinbaseApp(appPath)
{
    const self = this;

    AsyncEventEmitter.mixin(self);


    self.config = null;
    self.storages = {};
    self.models = {};
    self.appPath = appPath;
    self._extensions = [];
    self._requireCache = {};
    self._fieldTypes = [];
    self._registry = {
        base: {
            Debug: "./helpers/Debug.js",
            Schema: "./helpers/Schema.js",
            Lets: "./helpers/Lets.js",
            View: "./helpers/View.js",
            propertyType: {
                common: "./helpers/SchemaProperties/common.js"
            }
        },
        Debug: "./helpers/Debug.js",
        Schema: "./helpers/Schema.js",
        View: "./helpers/View.js",
        Lets: "./helpers/Lets.js",
        propertyType: {
            common: "./helpers/SchemaProperties/common.js"
        }
    }

    self.modelRequires = {};
    self.singletonRouters = null;
    self.modelRouters = null;
    self.singletonRouterRequires = [];
    self.modelRouterRequires = [
        "./helpers/routes/createModelBaseRouter",
        "./helpers/routes/createAuthRouter",
        "./helpers/routes/createCrudRouter",
    ];
}


RobinbaseApp.prototype.init = function init(done)
{
    const self = this;

    const processes = [
        "loadTemplates",
        "loadWidgets",
        "initStorages",
        "initModels",
        "initModelCrud",
        "prepareModelJoins",
        "initPolicies",
        "createDefaultUser",
        "buildFrontendFormScript",
        "runModelInits",
    ];

    function runProcess(index)
    {
        if (typeof processes[index] === "undefined")
        {
            return self.emit(["initialized"], self, done);
            // return done();
        }

        self[processes[index]](function()
        {
            runProcess(index+1);
        });
    }

    runProcess(0);
}

RobinbaseApp.prototype.setGlobals = function setGlobals()
{
    const self = this;
    const appPath = self.appPath;

    const robinbase_path = __dirname;

    global.require_robinbase = function(path)
    {
        if (path.indexOf('/') === 0)
        {
            return require(robinbase_path+path);
        }

        if (typeof self._requireCache[path] === 'undefined')
        {
            self._requireCache[path] = self.loadRequiredFile(path);
        }
        return self._requireCache[path];
    }

    if (process.env.RB_DEBUG_LEVEL)
    {
        Debug.setGlobalDebugLevel(process.env.RB_DEBUG_LEVEL);
    }

    if (process.env.RB_DEBUG_PATTERN)
    {
        Debug.setGlobalDebugPattern(process.env.RB_DEBUG_PATTERN);
    }

    global.Debug = _Debug;
}

RobinbaseApp.prototype.loadExtensions = function loadExtensions(done)
{
    const self = this;
    const basePath = self.appPath;
    const declarationPath = nodepath.resolve(basePath, './extensions.js');
    let extensions = self._extensions = require(declarationPath);
    extensions.unshift(require('./base-extension'));

    const registry = self._registry;
    const extensionNamespaces = new Map();

    var extensionsLoaded = 0;

    function readDependencies(extension)
    {
        if (extensionNamespaces.has(extension.namespace))
        {
            return [];
        }

        extensionNamespaces.set(extension.namespace, extension);
        let dependencies = [];

        if (Array.isArray(extension.dependencies))
        {
            dependendencies = RobinbaseApp.utils.flattenArray(extension.dependencies.map(readDependencies));
        }

        return dependendencies.concat([extension]);
    }

    extensions = RobinbaseApp.utils.flattenArray(extensions.map(readDependencies));

    function extensionsIter(extensionIndex)
    {
        if (extensionsLoaded === extensions.length)
        {
            return done();
        }
        const extension = extensions[extensionIndex];

        const extensionPath = extension.path;
        if (!extensionPath)
        {
            throw new Error(`An extension was loaded with name '${extension.name || ''}', but it is missing its path declaration.`);
        }
        const namespace = extension.namespace;

        if (!namespace)
        {
            throw new Error(`Robinbase extension with name '${extension.name || ''}' at path '${extensionPath}' needs to have a unique namespace declared in its index.js file.`);
        }


        const actions = [
            "readExtensionModels",
            "readExtensionServices",
            "readExtensionStorages",
            "readExtensionRouters",
            "readExtensionWidgets",
            "readExtensionPropertyTypes",
            "readExtensionFieldTypes",
        ];

        function iterator(index)
        {
            var action = actions[index]
            if (typeof action === "undefined")
            {
                extensionsLoaded += 1;

                return process.nextTick(extensionsIter, extensionIndex + 1)
            }

            self[action](extensionPath, namespace, function()
            {
                process.nextTick(iterator, index + 1);
            });
        }

        iterator(0);

    }

    extensionsIter(0);

}

RobinbaseApp.prototype.readExtensionModels = function readExtensionModels(extensionPath, namespace, done)
{
    const self = this;
    const registry = self._registry;

    RobinbaseApp.utils.loadDirectoryToRegistry(registry, extensionPath, namespace, "model", function(items)
    {
        Object.keys(items).forEach(function(key)
        {
            // self.modelRequires[key] = items[key];
            self.modelRequires[`${namespace}:${key}`] = items[key];
        });

        done();
    });
}

RobinbaseApp.prototype.readExtensionServices = function readExtensionServices(extensionPath, namespace, done)
{
    const self = this;
    const registry = self._registry;

    RobinbaseApp.utils.loadDirectoryToRegistry(registry, extensionPath, namespace, "service", done);
}

RobinbaseApp.prototype.readExtensionStorages = function readExtensionStorages(extensionPath, namespace, done)
{
    const self = this;
    const registry = self._registry;

    RobinbaseApp.utils.loadDirectoryToRegistry(registry, extensionPath, namespace, "storage", done);
}

RobinbaseApp.prototype.readExtensionRouters = function readExtensionRouters(extensionPath, namespace, done)
{
    const self = this;
    const routerTypes = ["singleton", "model"];

    function iter(index)
    {
        if (typeof routerTypes[index] === "undefined")
        {
            return done();
        }

        RobinbaseApp.utils.readdirRecursively(nodepath.resolve(extensionPath, "router", routerTypes[index]), function(err, items)
        {
            const key = `${routerTypes[index]}RouterRequires`;
            self[key] = self[key].concat(items.map(function(item)
            {
                return nodepath.resolve(extensionPath, "router", routerTypes[index], item);
            }));

            process.nextTick(iter, index + 1);
        });
    }

    iter(0);
}

RobinbaseApp.prototype.readExtensionWidgets = function readExtensionWidgets(extensionPath, namespace, done)
{

    const self = this;
    const registry = self._registry;

    RobinbaseApp.utils.loadDirectoryToRegistry(registry, extensionPath, namespace, "widget", done);
}

RobinbaseApp.prototype.readExtensionPropertyTypes = function readExtensionPropertyTypes(extensionPath, namespace, done)
{
    const self = this;
    const registry = self._registry;
    const Schema = require('./helpers/Schema');

    RobinbaseApp.utils.loadDirectoryToRegistry(registry, extensionPath, namespace, "propertyType", function(items)
    {
        // eagerly load these
        Object.keys(items).forEach(function(key)
        {
            require(items[key])(Schema);
        });

        done();
    });
}

RobinbaseApp.prototype.readExtensionFieldTypes = function readExtensionFieldTypes(extensionPath, namespace, done)
{
    const self = this;

    RobinbaseApp.utils.readdirRecursively(nodepath.resolve(extensionPath, "fieldType"), function(err, items)
    {
        function iter(index)
        {
            if (index >= items.length)
            {
                return done();
            }

            const path = nodepath.resolve(extensionPath, "fieldType", items[index] + ".js")
            fs.readFile(path, "utf8", function(err, data)
            {
                if (err)
                {
                    Debug.warn(`Unable to load field type at ${path}`);
                }
                else
                {
                    self._fieldTypes.push(data);
                }

                process.nextTick(iter, index + 1);
            });
        }

        iter(0);
    });
}

RobinbaseApp.prototype.buildFrontendFormScript = function buildFrontendFormScript(done)
{
    const self = this;
    const TemplateLoader = require_robinbase('base:service:processor:TemplateLoader');

    // only run on admin??
    if (!self.config.RB_ADMIN)
    {
        return done();
    }

    const tmpDir = process.env.FRONT_END_TMP || __dirname
    const mainFormFilePath = nodepath.resolve(__dirname, './frontend/Form.js');
    const tempDirPath = nodepath.resolve(tmpDir, './_frontendtmp');
    const tempFilePath = nodepath.resolve(tempDirPath, './form.js');

    fs.unlink(tempFilePath, function(err) {
        fs.rmdir(tempDirPath, function(err) {
            // ignore error
            if (err) {
                Debug.warn(err);
            }

            fs.readFile(mainFormFilePath, "utf8", function(err, data) {
                if (err)
                {
                    Debug.error('Could not build admin form[1]: ', err);
                    return done();
                }

                const newContents = [`/*generated ${Date()}*/\n`,data].concat(self._fieldTypes.map(function(value){
                    return `(function(){\n\n${value}\n\n}).call(global);`;
                })).join('\n\n');

                fs.mkdir(tempDirPath, function(err) {
                    if (err)
                    {
                        Debug.error('Could not build admin form[2]: ', err);
                        return done();
                    }

                    fs.writeFile(tempFilePath, newContents, function(err) {
                        if (err)
                        {
                            Debug.error('Could not build admin form[3]: ', err);
                            return done();
                        }

                        Debug.log('FRONT END FORM CREATED');

                        // build the thing
                        const b = browserify()
                            .transform(babelify, {presets: ['babel-preset-env']})
                            .transform(function(file) {
                                const through = require('through2');
                                return through(function (buf, enc, next) {
                                    this.push(buf.toString('utf8').replace(/require_robinbase\(["']([^"']+)["']\)/, function(match, p1) {
                                        Debug.debug('PATH TO BE REPLACED IS: ', p1);
                                        // Debug.warn('CLIENT PATH: ', `require("${self.loadRequiredFile(path, true)}"`);
                                        return `require("${self.loadRequiredFile(p1, true)}")`;
                                    }));
                                    next();
                                });
                            });
                        b.add(tempFilePath);
                        b.bundle(function(err, buffer)
                        {
                            if (err)
                            {
                                Debug.error('Could not build admin form[4]: ', err);
                                return done();
                            }

                            // register as a template
                            TemplateLoader.templateData['system.frontend.form'] = buffer.toString('utf8');
                            Debug.log('Successfully built frontend form');
                            done();
                        })
                    });
                })
            });
        });
    });
}

RobinbaseApp.prototype.loadConfig = function loadConfig()
{
    const self = this;
    const DefaultConfig = require('./defaults.js');
    const Schema = require('./helpers/Schema');
    self._extensions.forEach(function(extension)
    {
        DefaultConfig.addExtensionDefaults(extension.env || {});
        if (typeof extension.compileEnv === "function")
        {
            DefaultConfig.addEnvironmentCompiler(extension.compileEnv);
        }
    });

    const configPath = nodepath.resolve(self.appPath, './config.js');
    const config = self.config = require(configPath);
    DefaultConfig.compileServices(config);

    // load all the models
    const adminModels = {};
    const allModels = {};

    function shortName(key)
    {
        const parts = key.split(":");
        const name = parts[parts.length - 1];
        return pluralize(name[0].toLowerCase() + name.substr(1));
    }

    if (config.storages.default && config.storages.default.idTypeName)
    {
        Schema.registerPropertyType('id', () => {
            return Schema[config.storages.default.idTypeName];
        });
    }
    else
    {
        Schema.registerPropertyType('id', () => {
            // this is for backwards compatibility
            return Schema.objectid;
        });
    }

    Object.keys(self.modelRequires).forEach(function(key)
    {
        const Model = require(self.modelRequires[key]);
        if (!Model)
        {
            return;
        }
        const shortKey = Model.modelKey || Model.collection || shortName(key);


        allModels[shortKey] = Model;
    });

    if (!config.allModels)
    {
        config.allModels = allModels;
    }


    // this is done second, just in case a model require
    // modifies a different model
    Object.keys(allModels).forEach(function(key)
    {
        const Model = allModels[key];
        if (Model.view && !Model.view.internalOnly)
        {
            adminModels[key] = Model;
        }
    });

    if (!config.adminModels)
    {
        config.adminModels = adminModels;
    }

    // make sure everything in admin models is also in all models
    // so that they do not have to be configured twice
    if (config.allModels && config.adminModels)
    {
        for (var key in config.adminModels)
        {
            if (typeof config.allModels[key] === 'undefined')
            {
                config.allModels[key] = config.adminModels[key];
            }
        }
    }

    if (config.allModels)
    {
        // set the model key for each model class
        for (var key in config.allModels)
        {
            config.allModels[key].modelKey = key;
        }
    }

    Debug.debug("ALL MODELS: ", config.allModels);
    Debug.debug("ADMIN MODELS: ", config.adminModels);
    Object.assign(require('./config.js'), config);
}

RobinbaseApp.prototype.loadTemplates = function loadTemplates(done)
{
    const self = this;
    const config = self.config;
    const TemplateLoader = require('./helpers/processor/TemplateLoader.js');

    const templateLoader = new TemplateLoader();
    const includePaths = ['templates'];

    const extensionPaths = self._extensions.map(function(extension)
    {
        return extension.path;
    });
    const paths = [nodepath.resolve(__dirname, './'), config.RB_FILE_PATH].concat(extensionPaths);

    templateLoader.loadAllTemplates(paths, ['html', 'css'], includePaths, done);
}

RobinbaseApp.prototype.loadWidgets = function loadWidgets(done)
{
    const self = this;
    const widgets = self._registry.widget;

    Object.keys(widgets).forEach(function(key)
    {
        require(widgets[key]);
    });

    done();
}

RobinbaseApp.prototype.initStorages = function initStorages(done)
{
    var self = this;
    var config = self.config;

    var storages = this.storages = config.storages;
    var storageKeys = Object.keys(storages);

    function iter(index)
    {
        if (typeof storageKeys[index] === 'undefined')
        {
            return done();
        }

        storages[storageKeys[index]].init(function(err)
        {
            if (err)
            {
                throw err;
                // return Debug.critical("Critical Error.  Process Stopping.", err);
            }

            iter(index+1);
        });
    }

    iter(0);
}

RobinbaseApp.prototype.initModels = function initModels(done)
{
    const AsyncEventEmitter = require_robinbase('base:service:communication:AsyncEventEmitter');
    const self = this;
    const config = self.config;


    const storages = self.storages;
    const models = self.models = config.allModels;
    const modelKeys = Object.keys(models);

    const View = require('./helpers/View');

    function iter(index)
    {
        if (typeof modelKeys[index] === 'undefined')
        {
            return done();
        }

        var Model = models[modelKeys[index]];

        AsyncEventEmitter.mixin(Model);

        Model.view = Model.view || {};
        if (!(Model.view instanceof View))
        {
            Model.view = new View(Model.view);
        }

        // if (Model.view && Model.schema)
        // {
        //     Model.schema.setView(Model.view);
        // }

        var storageName = Model.storageName;

        if (!storageName)
        {
            storageName = 'default';
            Model.storageName = storageName;
        }

        if (storages[storageName])
        {
            storages[storageName].prepareCollection(Model, function(err)
            {
                if (err)
                {
                    return Debug.critical(err);
                }

                iter(index+1);
            });
        }
        else
        {
            iter(index+1);
        }
    }

    iter(0);
}

RobinbaseApp.prototype.initModelCrud = function initModelCrud(done)
{
    var self = this;
    var models = self.models;
    var modelKeys = Object.keys(models);
    var Crud = require('./helpers/Crud.js');

    function iter(index)
    {
        if (typeof modelKeys[index] === 'undefined')
        {
            return done();
        }

        var Model = models[modelKeys[index]];
        Crud.addCrudToClass(Model);

        iter(index+1);
    }

    iter(0);
}

RobinbaseApp.prototype.prepareModelJoins = function prepareModelJoins(done)
{
    var self = this;
    var models = self.models;
    var modelKeys = Object.keys(models);

    function iter(index)
    {
        if (typeof modelKeys[index] === 'undefined')
        {
            return done();
        }

        var Model = models[modelKeys[index]];

        if (Model.joins)
        {
            Object.keys(Model.joins).forEach((key) =>
            {
                if (Model.joins[key] && !Model.joins[key].projection && Model.joins[key].collection)
                {
                    const OtherModel = models[Model.joins[key].collection];
                    if (OtherModel)
                    {
                        Model.joins[key].projection = Object.keys(OtherModel.schema.props).reduce((res, key) =>
                        {
                            res[key] = 1;
                            return res;
                        }, {});
                    }
                }
            });
        }

        iter(index+1);
    }

    iter(0);
}

RobinbaseApp.prototype.runModelInits = function runModelInits(done)
{
    var self = this;
    var models = self.models;
    var modelKeys = Object.keys(models);

    function iter(index)
    {
        if (typeof modelKeys[index] === 'undefined')
        {
            return done();
        }

        var Model = models[modelKeys[index]];
        if (typeof Model.init === 'function') {
            Model.init((err) => {
                if (err) {
                    return done(err);
                }

                iter(index+1);
            });
        } else {
            iter(index+1);
        }
    }

    iter(0);
}

RobinbaseApp.prototype.initPolicies = function initPolicies(done)
{
    var self = this;
    var config = self.config;
    var models = self.models;

    if (config.RB_ADMIN != 1)
    {
        return done(null);
    }

    var rolesModel = null;
    var policiesModel = null;

    var roles = config.policyData ? config.policyData.roles || [] : [];
    var policies = config.policyData ? config.policyData.policies || {} : {};

    if (config.RB_ROLES_MODEL)
    {
        rolesModel = models[config.RB_ROLES_MODEL];
    }
    if (config.RB_POLICIES_MODEL)
    {
        policiesModel = models[config.RB_POLICIES_MODEL];
    }

    Debug.debug('ROLES MODEL', rolesModel);
    Debug.debug('POLICIES MODEL', policiesModel);

    if (!rolesModel || !policiesModel)
    {
        Debug.log('Roles or policies model not defined so not loading authorization data');
        return done();
    }

    var policiesMap = {};

    function removeSystemPolicies()
    {
        policiesModel.crud.get({source: "System"}, function(err, result)
        {
            function removeIter(ind)
            {
                if (typeof result == 'undefined')
                {
                    return policiesIter(0);
                }
                if (typeof result[ind] == 'undefined')
                {
                    return policiesIter(0);
                }

                policiesModel.crud.delete({_id: result[ind]._id}, function(err, res)
                {
                    removeIter(ind+1);
                });
            }

            removeIter(0);
        });
    }

    function removeSystemRoles()
    {
        rolesIter(0);
    }


    function processRole(role, callback)
    {
        if (typeof role === "string")
        {
            role = {name: role};
        }

        role.source = "System";

        role.policies = (role.policies || []).map(function(policyId){
            return policiesMap[policyId];
        });


        rolesModel.crud.getOne({name: role.name}, function(err, existing)
        {
            if (err)
            {
                return callback(err);
            }

            if (existing == null)
            {
                var roleObj = new rolesModel(role);
                rolesModel.crud.create(roleObj, function(err, result)
                {
                    callback(err);
                });
            }
            else
            {
                rolesModel.crud.update({_id: existing._id}, role, function(err, result)
                {
                    callback(err);
                });
            }
        })
    }

    function processPolicy(policy, key, callback)
    {
        policy.source = "System";

        var policyObj = new policiesModel(policy);
        // THIS WILL BREAK ON NON MONGO MODEL!!
        if (policyObj._id == null && policyObj.constructor.generateId) {
            policyObj._id = policyObj.constructor.generateId();
        }
        policiesModel.crud.create(policyObj, function(err, result)
        {
            if (err || !result) {
                Debug.warn('Error creating policy', err, JSON.stringify(policyObj, null, '\t'));
                return callback(err);
            }
            policiesMap[key] = result._id;
            callback(err);
        });
    }


    function rolesIter(ind)
    {
        if (typeof roles[ind] === 'undefined')
        {
            return done()
        }

        processRole(roles[ind], function(err)
        {
            if (err)
            {
                throw (err);
            }

            rolesIter(ind + 1);
        });
    }

    function policiesIter(ind)
    {
        var key = policyKeys[ind];
        if (typeof key === 'undefined')
        {
            return removeSystemRoles();
        }

        processPolicy(policies[key], key, function(err)
        {
            if (err)
            {
                throw (err);
            }

            policiesIter(ind+1);
        });
    }

    function randomId() {
        var allowed = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890";

        var string = "";

        for (var i = 0; i < 8; i++) {
            string += allowed[Math.floor(Math.random() * allowed.length)];
        }

        return string;
    }

    // so you can define them inline if that is what you prefer
    roles.forEach(function(role){
        (role.policies || []).forEach(function(policy, index){
            if (typeof policy === 'object') {
                var id = randomId();
                policies[id] = policy;
                role.policies[index] = id;
            }
        });
    });

    var policyKeys = Object.keys(policies);

    removeSystemPolicies(0);
}

RobinbaseApp.prototype.createDefaultUser = function createDefaultUser(done)
{
    const self = this;
    const config = self.config;

    if (!config.allModels.users || config.RB_ADMIN != 1)
    {
        return done();
    }

    const User = config.allModels.users;
    User.crud.count({}, function(err, count){
        if (err)
        {
            Debug.warn('Could not create the default user', err);
            return done();
        }

        if (count > 0)
        {
            return done();
        }

        const defaultUser = new User({
            name: 'Default System Administrator',
            email: 'admin@fakedomain.com',
            verified: true,
            password: 'Changeme1!',
            role: 'Super Admin',
        });

        User.crud.create(defaultUser, function(err, result)
        {
            if (err)
            {
                Debug.warn('Could not create the default user', err);
            }

            done();
        });
    });
}

RobinbaseApp.prototype.run = function run()
{
    var self = this;
    var config = self.config;

    config.startUp(config, self);
}

RobinbaseApp.prototype.loadRequiredFile = function loadRequiredFile(path, returnPath = false)
{
    const self = this;
    var value = self._registry;

    var pathParts = path.split(':');
    var pathPart;

    // special override to load the application instance
    if (path === 'app')
    {
        return self;
    }

    // special override to load the application config
    if (path === 'config' || path === 'Config')
    {
        return self.config;
    }

    for(var i = 0; i < pathParts.length; i++)
    {
        pathPart = pathParts[i];
        if (value[pathPart] == null)
        {
            Debug.debug('PATH IS: ', path, ' REGISTRY: ', JSON.stringify(self._registry, null, '\t'));
            throw new Error("Could not load robinbase module with path[1] " + path);
        }

        value = value[pathPart];
    }

    if (typeof value !== 'string')
    {
        throw new Error("Could not load robinbase module with path[2] " + path);
    }

    return returnPath ? value : require(value);
}

RobinbaseApp.prototype.getSingletonRouters = function()
{
    const self = this;

    if (self.singletonRouters == null)
    {
        self.singletonRouters = self.singletonRouterRequires.map(require);
    }
    return self.singletonRouters;
}

RobinbaseApp.prototype.getModelRouters = function()
{
    const self = this;

    if (self.modelRouters == null)
    {
        self.modelRouters = self.modelRouterRequires.map(require);
    }
    return self.modelRouters;
}

RobinbaseApp.prototype.buildAdminRouter = function()
{
    const self = this;

    const baseRouter = require('./helpers/routes/baseRouter.js');

    return baseRouter(self);
}

RobinbaseApp.prototype.getAllowedActions = function(context, authorization, Model, isRoot)
{
    const self = this;

    var modelRoute = null;
    if (Model && Model.view)
    {
        modelRoute = Model.view.route;
    }

    const allRouters = self.getModelRouters().concat(self.getSingletonRouters());

    return allRouters.reduce(function(result, router)
    {
        if (router && typeof router.allowedActions === 'function')
        {
            return result.concat(router.allowedActions(context, authorization, Model, isRoot));
        }

        return result;
    }, []);
}

RobinbaseApp.prototype.modelRoute = function(modelKey)
{
    const self = this;
    const Model = self.models[modelKey];
    if (!Model || !Model.view || !Model.view.route)
    {
        return null;
    }

    return Model.view.route;
}

RobinbaseApp.utils = {};
RobinbaseApp.utils.readdirRecursively = function(dirPath, callback)
{
    var results = [];

    function walk(prefix, path, done)
    {
        fs.readdir(path, function(err, contents)
        {
            if (err)
            {
                return done();
            }


            function iter(index)
            {
                if (typeof contents[index] === "undefined")
                {
                    return done();
                }

                // do not iterate over items with a _ prefix
                if (contents[index][0] === "_")
                {
                    return process.nextTick(iter, index + 1);
                }

                if (/\.js$/.test(contents[index]))
                {
                    results.push((prefix + contents[index]).replace(/.js$/, ''));
                    process.nextTick(iter, index + 1);
                }
                else
                {
                    var newPrefix = prefix + contents[index] + '/';
                    walk(newPrefix, nodepath.resolve(path, contents[index]), function()
                    {
                        process.nextTick(iter, index + 1);
                    });
                }
            }

            iter(0);
        });
    }

    walk("", dirPath, function()
    {
        callback(null, results);
    });
}

RobinbaseApp.utils.setPath = function(dest, path, value)
{
    var last = path.pop();
    for (let i = 0; i < path.length; i++)
    {
        if (typeof dest[path[i]] === "undefined")
        {
            dest[path[i]] = {};
        }
        dest = dest[path[i]];
    }

    dest[last] = value;
}

RobinbaseApp.utils.loadDirectoryToRegistry = function(registry, extensionPath, namespace, key, done)
{
    RobinbaseApp.utils.readdirRecursively(nodepath.resolve(extensionPath, key), function(err, items)
    {
        items = items.reduce(function(result, itemName)
        {
            const registryPath = [key].concat(itemName.split("/"));
            const namespacePath = namespace ? namespace.split(':').concat(registryPath) : null;
            const itemPath = nodepath.resolve(extensionPath, key, itemName);
            RobinbaseApp.utils.setPath(registry, registryPath, itemPath);
            if (namespacePath)
            {
                RobinbaseApp.utils.setPath(registry, namespacePath, itemPath);
            }

            result[itemName.split('/').join(':')] = itemPath
            return result;
        }, {});

        done(items);
    });
}

RobinbaseApp.utils.flattenArray = function(arr, deep) {
    return arr.reduce((result, item) => {
        if (deep && Array.isArray(item)) {
            item = Robinbase.utils.flattenArray(item);
        }

        return Array.isArray(item) ? result.concat(item) : result.concat([item]);
    }, []);
}

module.exports = RobinbaseApp;
