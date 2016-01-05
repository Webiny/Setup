var through = require('through2');
var fs = require('fs');
var path = require('path');

module.exports = function (gulp, opts, $) {
    var assets = {};

    return {
        app: function (appObj) {
            assets[appObj.name] = {
                name: appObj.name,
                assets: {
                    js: [],
                    css: []
                },
                modules: []
            };
        },

        add: function (appObj) {
            // TODO: add /build/{env} path to make it absolute. That way we can simplify JS bootstrap even further

            return through.obj(function (file, encoding, callback) {
                var type = file.path.split('.').pop();

                // Validate extension
                if (['js', 'css'].indexOf(type) > -1) {
                    // Add asset to meta
                    var buildPath = opts.production ? '/build/production/' : '/build/development/';
                    var asset = file.path.split(appObj.name.replace('.', '/')).pop();
                    var assetPath = buildPath + appObj.name.replace('.', '/') + asset;
                    assets[appObj.name].assets[type].push(assetPath);
                }

                // Continue with pipe...
                callback(null, file);
            });
        },

        write: function (appObj) {
            var path = opts.buildDir + appObj.name.replace('.', '/') + '/meta.json';
            var data = assets[appObj.name];
            fs.writeFile(path, JSON.stringify(data, null, 4), function (err) {
                if (err) {
                    console.log(err);
                } else {
                    $.util.log("App meta saved to " + path);
                }
            });
        },

        module: function (appObj) {
            return through.obj(function (file, encoding, callback) {
                if (file.path.indexOf('/Module.js') > -1) {
                    var moduleParts = file.path.split('/Modules/').pop().split('/');
                    if (moduleParts.length === 2) {
                        // We have our module name
                        assets[appObj.name].modules.push(moduleParts[0]);
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
                var delim = appObj.name.replace('.', '/Js/');
                var dir = path.dirname(filename.split(delim).pop());
                return appPrefix + dir + source.replace('./', '/');
            }

            // Webiny is a collection of core tools and needs to be easily accessible from everywhere
            // import Webiny from 'Webiny';
            if (source === 'Webiny') {
                return 'Core/Webiny/webiny/webiny';
            }

            return source;
        }
    };
};