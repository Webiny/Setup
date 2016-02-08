var path = require('path');

module.exports = function (gulp, opts, $) {

    var pipes = {};

    pipes.babelProcess = function (appObj, moduleName) {
        return $.lazypipe()
            .pipe(function () {
                var babelOpts = {
                    moduleIds: true,
                    compact: false,
                    plugins: [
                        "transform-es2015-modules-systemjs"
                    ],
                    presets: ["es2015", "react"],
                    getModuleId: function (moduleName) {
                        return $.webinyAssets.getModuleId(appObj, moduleName);
                    },
                    resolveModuleSource: function (source, filename) {
                        return $.webinyAssets.resolveModuleSource(appObj, source, filename);
                    }
                };

                if (moduleName) {
                    babelOpts['moduleRoot'] = 'Modules/' + moduleName
                }

                return $.babel(babelOpts);
            })
            .pipe(function () {
                return $.replace('throw new TypeError("Cannot call a class as a function")', '')
            })
            .pipe(function () {
                return $.replace("throw new TypeError('Cannot call a class as a function')", '')
            })();
    };

    pipes.orderedVendorScripts = function (appObj) {
        var config = $.webiny.readAssetsConfig(appObj);
        return $.order(config.getVendors(), {base: appObj.sourceDir + '/Assets'});
    };

    pipes.orderedStyles = function (appObj) {
        var config = $.webiny.readAssetsConfig(appObj);
        return $.order(config.getStyles(), {base: appObj.sourceDir + '/Assets'});
    };

    pipes.minifiedFileName = function () {
        return $.rename(function (path) {
            path.extname = '.min' + path.extname;
        });
    };

    pipes.buildModuleScripts = function (appObj, moduleObj) {
        return gulp.src(moduleObj.scripts)
            .pipe($.webinyAssets.module(appObj))
            .pipe($.eslint(opts.config.eslint))
            .pipe($.eslint.format())
            .pipe($.duration(moduleObj.name + ' module'))
            .pipe(pipes.babelProcess(appObj, moduleObj.name))
            .pipe($.concat(moduleObj.name + '.min.js'))
            .pipe(gulp.dest(appObj.buildDir + '/scripts'))
            .pipe($.webinyAssets.add(appObj));
    };

    pipes.buildRemainingAppScripts = function (appObj) {
        return gulp.src(opts.config.paths.scriptsDev(appObj.sourceDir))
            .pipe($.eslint(opts.config.eslint))
            .pipe($.eslint.format())
            .pipe($.duration('App scripts'))
            .pipe(pipes.babelProcess(appObj))
            .pipe($.concat('app.min.js'))
            .pipe(gulp.dest(appObj.buildDir + '/scripts'))
            .pipe($.webinyAssets.add(appObj));
    };

    pipes.buildAppScripts = function (appObj) {
        if (opts.production) {
            // If in production mode - will build entire app directory into app.min.js
            return gulp.src(opts.config.paths.scripts(appObj.sourceDir))
                .pipe($.eslint(opts.config.eslint))
                .pipe($.eslint.format())
                .pipe($.duration('App scripts'))
                .pipe($.webinyAssets.module(appObj))
                .pipe($.sourcemaps.init())
                .pipe(pipes.babelProcess(appObj))
                .pipe($.concat('app.min.js'))
                .pipe($.ifElse(opts.production, function () {
                    return $.uglify({mangle: false});
                }))
                .pipe($.sourcemaps.write('.'))
                .pipe(gulp.dest(appObj.buildDir + '/scripts'))
                .pipe($.webinyAssets.add(appObj));
        } else {
            // If in development mode - will build each module separately and remaining app scripts into app.min.js

            var modules = [];
            appObj.modules.map(function (moduleObj) {
                modules.push(pipes.buildModuleScripts(appObj, moduleObj));
            });
            modules.push(pipes.buildRemainingAppScripts(appObj));

            return $.es.concat.apply(null, modules);
        }
    };

    pipes.buildVendorScripts = function (appObj) {
        var cssFilter = $.filter(['**/*.css', '**/*.less']);
        var jsFilter = $.filter('**/*.js');
        var es6Filter = $.filter('**/*.es6.js');
        var fontFilter = $.filter(['*.eot', '*.woff', '*.svg', '*.ttf']);
        var imageFilter = $.filter(['*.gif', '*.png', '*.svg', '*.jpg', '*.jpeg']);

        var merge = [];
        try {
            var bowerPipe = gulp.src($.mainBowerFiles({paths: appObj.sourceDir + '/Assets'}));
            merge.push(bowerPipe);
        } catch (e) {
            // Do nothing
        }

        var customPipe = gulp.src(appObj.sourceDir + '/Assets/custom_components/**/*.js');
        merge.push(customPipe);

        return $.es.merge(merge)
            .pipe($.duration('Vendor scripts'))
            // ES6
            .pipe(es6Filter)
            .pipe($.eslint(opts.config.eslint))
            .pipe($.eslint.format())
            .pipe($.rename(function(path){
                path.basename = path.basename.replace('.es6', '');
            }))
            .pipe(pipes.babelProcess(appObj))
            .pipe(es6Filter.restore())
            // JS
            .pipe(jsFilter)
            .pipe(pipes.orderedVendorScripts(appObj))
            .pipe($.concat('vendors.min.js'))
            .pipe($.ifElse(opts.production, function () {
                return $.uglify({mangle: false});
            }))
            .pipe(gulp.dest(appObj.buildDir + '/scripts'))
            .pipe($.webinyAssets.add(appObj))
            .pipe(jsFilter.restore())

            // CSS/LESS
            .pipe(cssFilter)
            .pipe($.sourcemaps.init())
            .pipe($.less())
            .pipe(pipes.orderedVendorScripts(appObj))
            .pipe($.concat('vendors.min.css'))
            .pipe($.ifElse(opts.production, function () {
                return $.minifyCss();
            }))
            .pipe($.sourcemaps.write())
            .pipe(gulp.dest(appObj.buildDir + '/css'))
            .pipe($.webinyAssets.add(appObj))
            .pipe(cssFilter.restore())

            // FONTS
            .pipe(fontFilter)
            .pipe($.flatten())
            .pipe(gulp.dest(appObj.buildDir + '/fonts'))
            .pipe(fontFilter.restore())

            // IMAGES
            .pipe(imageFilter)
            .pipe($.flatten())
            .pipe(gulp.dest(appObj.buildDir + '/images'))
            .pipe(imageFilter.restore())
    };

    pipes.buildStyles = function (appObj) {
        return gulp.src(opts.config.paths.styles(appObj.sourceDir))
            .pipe($.duration('Styles'))
            .pipe(pipes.orderedStyles(appObj))
            .pipe($.replace('../../', ''))
            .pipe($.concat('styles.css'))
            .pipe($.ifElse(opts.production, function () {
                return $.minifyCss();
            }))
            .pipe(pipes.minifiedFileName())
            .pipe(gulp.dest(appObj.buildDir + '/css'))
            .pipe($.webinyAssets.add(appObj));
    };

    pipes.buildFonts = function (appObj) {
        return gulp.src(opts.config.paths.fonts(appObj.sourceDir))
            .pipe($.duration('Fonts'))
            .pipe(gulp.dest(appObj.buildDir + '/fonts'));
    };

    pipes.buildImages = function (appObj) {
        return gulp.src(opts.config.paths.images(appObj.sourceDir))
            .pipe(gulp.dest(appObj.buildDir + '/images/'));
    };

    pipes.buildJsApp = function (appObj) {
        return $.es.concat.apply(null, [
            pipes.buildVendorScripts(appObj),
            pipes.buildAppScripts(appObj),
            pipes.buildStyles(appObj),
            pipes.buildFonts(appObj),
            pipes.buildImages(appObj)
        ]);
    };

    pipes.buildApp = function (app, jsApp) {
        return Promise.all($.webiny.getApps(app, jsApp).map(function (appObj) {
            $.webinyAssets.app(appObj);
            return new Promise(function(resolve, reject){
                pipes.buildJsApp(appObj).on('end', function () {
                    $.webinyAssets.write(appObj, resolve);
                }).on('error', reject);
            });
        }));
    };

    return pipes;
};