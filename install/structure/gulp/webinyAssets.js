var through = require('through2');
var fs = require('fs');


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
            return through.obj(function (file, encoding, callback) {
                var type = file.path.split('.').pop();

                // Validate extension
                if(['js', 'css'].indexOf(type) > -1){
                    // Add asset to meta
                    var asset = file.path.split(appObj.name.replace('.', '/')).pop();
                    assets[appObj.name].assets[type].push(appObj.name.replace('.', '/') + asset);
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
        }
    };
};