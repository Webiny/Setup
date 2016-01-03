module.exports = function (gulp, opts, $) {

    var pipes = {};

    pipes.babelProcess = function (moduleName) {
        return $.lazypipe()
            .pipe(function () {
                var babelOpts = {
                    modules: 'system',
                    moduleIds: true,
                    compact: false
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
        return $.order(opts.config.vendorsOrder, {base: appObj.sourceDir + '/Assets'});
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
            .pipe(pipes.babelProcess(moduleObj.name))
            .pipe($.concat(moduleObj.name + '.min.js'))
            .pipe(gulp.dest(appObj.buildDir + '/scripts'))
            .pipe($.webinyAssets.add(appObj));
    };

    pipes.buildRemainingAppScripts = function (appObj) {
        return gulp.src(opts.config.paths.scriptsDev(appObj.sourceDir))
            .pipe($.eslint(opts.config.eslint))
            .pipe($.eslint.format())
            .pipe($.duration('App scripts'))
            .pipe(pipes.babelProcess())
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
                .pipe(pipes.babelProcess())
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
            .pipe(pipes.babelProcess())
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
            .pipe(gulp.dest(appObj.buildDir + '/img/'));
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
        return $.webiny.getApps(app, jsApp).map(function (appObj) {
            $.webinyAssets.app(appObj);
            return pipes.buildJsApp(appObj).on('end', function () {
                $.webinyAssets.write(appObj);
            });
        });
    };

    return pipes;
};