var yaml = require('js-yaml');
var fs = require('fs');

function AssetsConfig(config) {

    this.getStyles = function () {
        return config.Assets && config.Assets.Styles || [];
    };

    this.getVendors = function () {
        return config.Assets && config.Assets.Vendors || [];
    };
}

var assetsConfigs = {};

module.exports = function (gulp, opts, $) {

    function getFolders(dir) {
        try {
            return $.fs.readdirSync(dir).filter(function (file) {
                return $.fs.statSync($.path.join(dir, file)).isDirectory();
            });
        } catch (e) {
            return [];
        }
    }

    function readJsApps(app, jsApp, dir, version) {
        var jsApps = [];
        getFolders(dir).map(function (jsAppFolder) {
            if (jsApp && jsApp != jsAppFolder) {
                return;
            }

            var modules = [];
            getFolders(dir + '/' + jsAppFolder + '/Modules').map(function (moduleFolder) {
                modules.push({
                    name: moduleFolder,
                    scripts: dir + '/' + jsAppFolder + '/Modules/' + moduleFolder + '/**/*.{js,jsx}'
                });
            });

            var buildDir = opts.buildDir + app + '/' + jsAppFolder;
            if (version) {
                buildDir = opts.buildDir + app + '/' + version + '/' + jsAppFolder;
            }

            var appMeta = {
                key: app + '.' + jsAppFolder + (version ? '.' + version : ''),
                name: app + '.' + jsAppFolder,
                path: app + '/' + (version ? version + '/' : '') + jsAppFolder,
                buildDir: buildDir,
                sourceDir: dir + '/' + jsAppFolder,
                modules: modules
            };

            if (version) {
                appMeta.version = version;
            }

            jsApps.push(appMeta);
        });

        return jsApps;
    }

    return {
        getApps: function (app, jsApp) {
            var dir = app ? './Apps/' + app + '/Js' : './Apps';

            if (app) {
                return readJsApps(app, jsApp, dir);
            }

            var jsApps = [];
            getFolders(dir).map(function (app) {
                var versionsDir = './Apps/' + app;
                if (app === 'Core') {
                    var dir = versionsDir + '/Js';
                    readJsApps(app, jsApp, dir, null).map(function (appObj) {
                        jsApps.push(appObj);
                    });
                } else {
                    getFolders(versionsDir).map(function (version) {
                        var dir = versionsDir + '/' + version + '/Js';
                        readJsApps(app, jsApp, dir, version).map(function (appObj) {
                            jsApps.push(appObj);
                        });
                    });
                }
            });

            return jsApps;
        },

        readAssetsConfig: function (appObj) {
            if (!assetsConfigs[appObj.name]) {
                try {
                    assetsConfigs[appObj.name] = yaml.safeLoad(fs.readFileSync(appObj.sourceDir + '/Assets/Assets.yaml', 'utf8'));
                } catch (e) {
                    return new AssetsConfig({});
                }
            }

            return new AssetsConfig(assetsConfigs[appObj.name]);
        }
    };
};