var Debug = require('../Debug.js').prefix('TEMPLATE LOADER');
var Config = require('../../config.js');
var fs = require('fs');


var TemplateLoader = function TemplateLoader()
{
    var self = this;
    self.callback = null;
    self.loadAtPath = function loadAtPath(path, _callback)
    {
        self.callback = _callback;
        Debug.log('TEMPLATE LOADER', 'Loading templates... please wait...');
        fs.readdir(path, function(err, files)
        {
            if (err != null)
            {
                throw err;//'Could not find plugin folder. Abort launch.';
            }

            if (files.length == 0)
            {
                throw 'No templates were found.  Abort Launch.';
            }

            self.loadTemplateData(0, files);
        });
    }

    self.loadAllTemplates = function loadAllTemplates(basePath, ext, includePaths, callback)
    {
        if (Array.isArray(ext) != true)
        {
            ext = [ext];
        }
        Debug.log('Loading templates... please wait...', basePath);

        var walk = function(key, dir, done)
        {

            //get directory list
            fs.readdir(dir, function(err, list)
            {
                if (err)
                {
                    if (err.code !== "ENOENT")
                    {
                        Debug.error(err)
                    }
                    return done(err);
                }

                var i = 0;

                (function next()
                {
                    var file = list[i++];
                    if (!file)
                    {
                        //finished with folder
                        return done(null, TemplateLoader.templateData);
                    }

                    //check if adding new path
                    if(dir.lastIndexOf('/') < (dir.length-1))
                    {
                        dir += '/';
                    }

                    var fileKey = key;
                    //check if adding new path
                    if(fileKey.lastIndexOf('.') < (fileKey.length-1))
                    {
                        fileKey += '.';
                    }


                    //full filepath
                    var filePath = dir + file;
                    //get file stats
                    fs.stat(filePath, function(err, stat)
                    {
                        //is this a directory
                        if (stat && stat.isDirectory())
                        {
                            //don't use excluded paths or hidden folders

                            if(file.indexOf('.') == 0)
                            {
                                return next();
                            }

                            //go to subdirectory
                            walk(fileKey + file, filePath, function(err, res)
                            {
                                if(err)
                                {
                                    return next();
                                }

                                next();
                            });
                        }
                        else
                        {

                            var reg = new RegExp('\\.('+ext.join('|')+')$')
                            var indexes = file.match(reg);


                            if (indexes != null)
                            {
                                fileKey = fileKey + file.substr(0, indexes.index);
                                fs.readFile(filePath, 'utf8', function(err, data)
                                {
                                    Debug.log('found template: ' + fileKey);
                                    TemplateLoader.templateData[fileKey] = data;
                                    next();
                                });
                            }
                            else
                            {
                                next();
                            }
                        }
                    });
                })();
            });
        };

        //start walking
        if (!Array.isArray(basePath))
        {
            basePath = [basePath];
        }

        function walkMany(iter)
        {
            if (typeof basePath[iter] == 'undefined')
            {
                return callback();
            }

            function includePathIter(iter2)
            {
                var path = includePaths[iter2];
                if (typeof path === 'undefined')
                {
                    walkMany(iter+1);
                }
                else
                {
                    var key = path.split('/').join('.');
                    walk(key, require('path').resolve(basePath[iter], path), function(){
                        includePathIter(iter2+1);
                    });
                }

            }

            includePathIter(0);
        }
        walkMany(0);

    }
    self.loadTemplateData = function loadTemplateData(iter, files)
    {
        if (typeof files[iter] == 'undefined')
        {
            Debug.log('All templates loaded.');
            self.callback();
            return;
        }
        fs.readFile(Config.RB_FILE_PATH + 'templates/' + files[iter], 'utf8', function(err, data)
        {
            var pKey = files[iter].replace(/\.[^\.]+$/, '');
            Debug.log('found template: ' + pKey);

            TemplateLoader.templateData[pKey] = data;
            iter += 1;

            self.loadTemplateData(iter, files);
        });
    }
}


TemplateLoader.templateData = {};

module.exports = TemplateLoader;


