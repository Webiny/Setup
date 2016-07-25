/* eslint-disable */
var yaml = require('js-yaml');
var fs = require('fs');
var Table = require('cli-table');

function AssetsConfig(config, $) {
    this.getStyles = function () {
        if (this.isLess()) {
            return $._.get(config, 'Assets.Styles.Less', '*.nostyle');
        }

        if (this.isSass()) {
            return $._.get(config, 'Assets.Styles.Sass', '*.nostyle');
        }

        return 'styles/css/**/*.css';
    };

    this.getStylesOrder = function () {
        return $._.get(config, 'Assets.Styles.Css', []);
    };

    this.getStylesReplacements = function () {
        var replacements = $._.get(config, 'Assets.Styles.Replacements', {});
        var patterns = [];
        $._.each(replacements, function (replacement, match) {
            patterns.push({
                match: match,
                replacement: replacement
            });
        });
        return patterns;
    };

    this.isLess = function () {
        return $._.has(config, 'Assets.Styles.Less');
    };

    this.isSass = function () {
        return $._.has(config, 'Assets.Styles.Sass');
    };

    this.isCss = function () {
        return $._.has(config, 'Assets.Styles.Css');
    };

    this.getVendors = function () {
        return config.Assets && config.Assets.Vendors || [];
    };
}

var assetsConfigs = {};

module.exports = function (gulp, opts, $) {

    var cyan = $.util.colors.cyan;
    var red = $.util.colors.red;

    var appsTable = new Table({
        head: [cyan('JS App'), cyan('Version'), cyan('Root directory'), cyan('Modules'), cyan('Notes')],
        colWidths: [35, 10, 50, 10, 30],
        colAligns: ['left', 'middle', 'left', 'middle']
    });

    function logInvalidApp(app, dir, note) {
        appsTable.push([
            red(app),
            red('-'),
            red(dir),
            red('-'),
            red(note || '')
        ]);
    }

    function getFolders(dir) {
        try {
            return $.fs.readdirSync(dir).filter(function (file) {
                return $.fs.statSync($.path.join(dir, file)).isDirectory() && file !== '.git';
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

            // Do not allow building of apps with missing App.js file
            if (!fs.existsSync(dir + '/' + jsAppFolder + '/App.js')) {
                logInvalidApp(app + '.' + jsAppFolder, dir + '/' + jsAppFolder, 'Missing App.js');
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

            appMeta.assets = $.webiny.readAssetsConfig(appMeta);
            appMeta.reloadAssetsConfig = function () {
                appMeta.assets = $.webiny.readAssetsConfig(appMeta, true);
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
            // Read all apps
            var dir = './Apps';
            var jsApps = [];
            getFolders(dir).map(function (appSubfolder) {
                // See if subfolder itself is an app (without version subfolder)
                var versionsDir = './Apps/' + appSubfolder;
                if (fs.existsSync(versionsDir + '/App.yaml')) {
                    // We have an app without version
                    var dir = versionsDir + '/Js';
                    // Read JS apps from given dir
                    readJsApps(appSubfolder, jsApp, dir, null).map(function (appObj) {
                        jsApps.push(appObj);
                    });
                } else {
                    // We may have a versioned app and we now need to read all version folders and make sure they are not Js or Php folders
                    var folders = getFolders(versionsDir);
                    // If it contains Js or Php folder it means it is not a versioned app, and it's missing an App.yaml file
                    if (!folders.length || folders.indexOf('Js') > -1 || folders.indexOf('Php') > -1) {
                        logInvalidApp(appSubfolder, versionsDir, 'Missing App.yaml');
                        return;
                    }

                    // Read JS apps from each version subfolder
                    folders.map(function (version) {
                        // Do not attempt to read apps with missing App.yaml
                        if (!fs.existsSync(versionsDir + '/' + version + '/App.yaml')) {
                            logInvalidApp(appSubfolder, versionsDir + '/' + version, 'Missing App.yaml');
                            return;
                        }

                        var dir = versionsDir + '/' + version + '/Js';
                        readJsApps(appSubfolder, jsApp, dir, version).map(function (appObj) {
                            jsApps.push(appObj);
                        });
                    });
                }
            });

            // Filter apps if necessary
            if (app) {
                jsApps = $._.filter(jsApps, function (a) {
                    if (app && jsApp) {
                        return a.name === app + '.' + jsApp;
                    }

                    return $._.startsWith(a.name, app + '.');
                });
            }

            return jsApps;
        },

        readAssetsConfig: function (appObj, force) {
            if (!assetsConfigs[appObj.name] || force) {
                try {
                    assetsConfigs[appObj.name] = yaml.safeLoad(fs.readFileSync(appObj.sourceDir + '/Assets/Assets.yaml', 'utf8'));
                } catch (e) {
                    return new AssetsConfig({}, $);
                }
            }

            return new AssetsConfig(assetsConfigs[appObj.name], $);
        },

        showAppsReport: function (apps) {
            apps.map(function(a){
                appsTable.push([
                    a.name,
                    $.util.colors.magenta(a.version || '-'),
                    a.sourceDir,
                    a.modules.length,
                    ''
                ]);
            });

            console.log(appsTable.toString());
        }
    };
};