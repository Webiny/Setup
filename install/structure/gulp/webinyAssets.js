var through = require('through2');
var fs = require('fs');
var path = require('path');

function fileExists(file, cb) {
    try {
        fs.statSync(file);
        return cb();
    }
    catch (e) {
        return false;
    }
}

function readModule(name, dir) {
    var config = {
        name: name,
        folders: [],
        module: false
    };

    var systemFolders = ['Actions', 'Components', 'Views'];
    var systemFiles = ['Module.js'];

    // Read folders
    systemFolders.map(function (folder) {
        fileExists(dir + '/' + folder + '/' + folder + '.js', function () {
            config.folders.push(folder);
        });
    });

    systemFiles.map(function (file) {
        fileExists(dir + '/' + file, function () {
            var key = file.replace('.js', '').toLowerCase();
            config[key] = true;
        });
    });

    return config;
}


module.exports = function (gulp, opts, $) {
    var assets = {};

    return {
        app: function (appObj) {
            var assetsPath = opts.production ? '/build/production/' : '/build/development/';
            var appPath = appObj.version ? appObj.name.replace('.', '/' + appObj.version + '/') : appObj.name.replace('.', '/');

            assets[appObj.key] = {
                name: appObj.name,
                version: appObj.version || null,
                assets: {
                    path: assetsPath + appPath,
                    js: [],
                    css: []
                },
                modules: {}
            };

            if (!appObj.version) {
                delete assets[appObj.key].version;
            }
        },

        add: function (appObj) {
            return through.obj(function (file, encoding, callback) {
                var type = file.path.split('.').pop();

                // Validate extension
                if (['js', 'css'].indexOf(type) > -1) {
                    // Add asset to meta
                    var buildPath = opts.production ? '/build/production/' : '/build/development/';
                    var asset = file.path.split(appObj.path).pop();

                    var assetPath = buildPath + appObj.path + asset;
                    assets[appObj.key].assets[type].push(assetPath);
                }

                // Continue with pipe...
                callback(null, file);
            });
        },

        write: function (appObj, then) {
            var delim = '/';
            if (appObj.version) {
                delim = '/' + appObj.version + '/';
            }
            var path = opts.buildDir + appObj.name.replace('.', delim) + '/meta.json';
            var data = assets[appObj.key];
            fs.writeFile(path, JSON.stringify(data, null, 4), function (err) {
                if (err) {
                    console.log(err);
                } else {
                    $.util.log("App meta saved to " + path);
                    then();
                }
            });
        },

        update: function (appObj) {
            return through.obj(function (file, encoding, callback) {
                var type = file.path.split('.').pop();

                // Validate extension
                if (['js', 'css'].indexOf(type) > -1) {
                    // Generate asset path
                    var buildPath = opts.production ? '/build/production/' : '/build/development/';
                    var asset = file.path.split(appObj.path).pop();
                    var assetPath = buildPath + appObj.path + asset;

                    // Remove old file from assets
                    var meta = assets[appObj.key];
                    $._.each(meta.assets[type], function (existing, index) {
                        if ($._.isEmpty(existing)) {
                            return;
                        }
                        var moduleName = existing.split('/').pop().split('-').shift();
                        if (moduleName === assetPath.split('/').pop().split('-').shift()) {
                            meta.assets[type].splice(index, 1);
                        }
                    });

                    // Add asset to meta
                    meta.assets[type].push(assetPath);

                    // Cleanup array of false-ish values
                    meta.assets[type] = $._.uniq($._.compact(meta.assets[type]));

                    // Write meta and continue with pipe
                    $.webinyAssets.write(appObj, function () {
                        callback(null, file);
                    });
                } else {
                    callback(null, file);
                }
            });
        },

        module: function (appObj) {
            return through.obj(function (file, encoding, callback) {
                if (file.path.indexOf('/Modules/') > -1) {
                    var paths = file.path.split('/Modules/');
                    var moduleParts = paths.pop().split('/');
                    if (!$._.has(assets[appObj.key].modules, moduleParts[0])) {
                        // We have our module name
                        var modulePath = paths[0] + '/Modules/' + moduleParts[0];
                        assets[appObj.key].modules[moduleParts[0]] = readModule(moduleParts[0], modulePath);
                    }
                }
                callback(null, file);
            });
        },

        /**
         * Get proper SystemJS module id
         *
         * @param appObj
         * @param moduleName
         * @returns {*}
         */
        getModuleId: function (appObj, moduleName) {
            // Apps entry points must be named with their logical names, ex: Core.Backend
            if (moduleName == 'App') {
                return appObj.name;
            }

            var appPrefix = appObj.name.replace('.', '/') + '/';

            // Modules must be named like this: Core/Backend/Modules/Components
            if ($._.startsWith(moduleName, 'Modules/') && $._.endsWith(moduleName, 'Module') && moduleName.split('/').length === 3) {
                return appPrefix + moduleName.substring(0, moduleName.lastIndexOf('/Module'));
            }

            // All other files should just be prefixed with app name, ex: Cms/Backend/{moduleName}
            return appPrefix + moduleName;
        },

        /**
         * Resolve import statements sources
         *
         * @param appObj
         * @param source
         * @param filename
         * @returns {*}
         */
        resolveModuleSource: function (appObj, source, filename) {
            // Relative sources should be resolved to the appropriate absolute paths
            if (source.indexOf('./') === 0) {
                var appPrefix = appObj.name.replace('.', '/');
                var parts = appObj.key.split('.');

                var delim = '';

                // If app key consists of 2 parts - it's a Core app and it does not have a version in its path
                // Otherwise - it's an app with version number in its path

                if (parts.length === 2) {
                    // part[0] = App name
                    // part[1] = JS app name
                    delim = parts[0] + '/Js/' + parts[1];
                } else {
                    // part[0] = App name
                    // part[1] = JS app name
                    // part[2] = version number (ie: v1.1)
                    delim = parts[0] + '/' + parts[2] + '/Js/' + parts[1];
                }

                var dir = path.dirname(filename.split(delim).pop());
                return appPrefix + dir + source.replace('./', '/');
            }

            // Webiny is a collection of core tools and needs to be easily accessible from everywhere
            // import Webiny from 'Webiny';
            if (source === 'Webiny') {
                return 'Core/Webiny/webiny/Webiny';
            }

            return source;
        }
    };
};