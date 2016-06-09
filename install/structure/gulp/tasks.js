module.exports = function (gulp, opts, $, pipes) {

    // removes all compiled files
    gulp.task('clean', function () {
        var deferred = $.q.defer();
        var dir = opts.buildDir + opts.app;
        if (opts.jsApp) {
            dir = dir + '/' + opts.jsApp;
        }
        $.del(dir, function () {
            deferred.resolve();
        });
        return deferred.promise;
    });

    // removes all compiled files for all apps
    gulp.task('clean-all', function () {
        var deferred = $.q.defer();
        $.del(opts.buildDir, function () {
            deferred.resolve();
        });
        return deferred.promise;
    });

    // cleans and builds a single app
    gulp.task('build', ['clean'], function () {
        $.webiny.showAppsReport();
        return Promise.all(opts.apps.map(function(app){
            return pipes.buildApp(app);
        }));

    });

    // cleans and builds all apps
    gulp.task('build-all', ['clean-all'], function () {
        $.webiny.showAppsReport();
        return Promise.all(opts.apps.map(function(app){
            return pipes.buildApp(app);
        }));
    });

    // watch live changes
    gulp.task('watch-all', ['build-all'], function () {

        $.livereload.listen(35729);

        var events = ['add', 'change'];

        opts.apps.map(function (appObj) {
            if (opts.production) {
                $.watch(opts.config.paths.scripts(appObj.sourceDir), {read: false, events: events}, function () {
                    $.util.log('Re-building ' + appObj.name + ' app scripts...');
                    return pipes.buildAppScripts(appObj).pipe($.livereload());
                });
            } else {
                // Watch each module separately
                appObj.modules.map(function (moduleObj) {
                    $.watch(moduleObj.scripts, {read: false, events: events}, function () {
                        $.util.log('Re-building ' + moduleObj.name + ' module...');
                        return pipes.buildModuleScripts(appObj, moduleObj).pipe($.webinyAssets.update(appObj)).pipe($.livereload());
                    });
                });

                // Watch remaining scripts
                $.watch(opts.config.paths.scriptsDev(appObj.sourceDir), {read: false, events: events}, function () {
                    $.util.log('Re-building ' + appObj.name + ' app scripts...');
                    return pipes.buildRemainingAppScripts(appObj).pipe($.livereload());
                });
            }

            $.watch(opts.config.paths.watchStyles(appObj), {read: false, events: events}, function () {
                $.util.log('Re-building ' + appObj.name + ' styles...');
                return pipes.buildStyles(appObj).pipe($.webinyAssets.update(appObj)).pipe($.livereload());
            });
        });
    });

    // watch live changes
    gulp.task('watch', ['build'], function () {
        $.livereload.listen(35729);
        var events = ['add', 'change'];
        opts.apps.map(function (appObj) {
            // Watch each module separately
            appObj.modules.map(function (moduleObj) {
                $.watch(moduleObj.scripts, {read: false, events: events}, function () {
                    $.util.log('Re-building ' + moduleObj.name + ' module...');
                    return pipes.buildModuleScripts(appObj, moduleObj).pipe($.webinyAssets.update(appObj)).pipe($.livereload());
                });
            });

            // Watch remaining scripts
            $.watch(opts.config.paths.scriptsDev(appObj.sourceDir), {read: false, events: events}, function () {
                $.util.log('Re-building ' + appObj.name + ' app scripts...');
                return pipes.buildRemainingAppScripts(appObj).pipe($.livereload());
            });

            $.watch(opts.config.paths.watchStyles(appObj), {read: false, events: events}, function () {
                $.util.log('Re-building ' + appObj.name + ' styles...');
                return pipes.buildStyles(appObj).pipe($.webinyAssets.update(appObj)).pipe($.livereload());
            });
        });
    });

    // Run tests
    gulp.task('run-tests', function () {
        var apps = $.webiny.getApps();
        return Promise.all(apps.map(function (appObj) {
            return new Promise(function (resolve, reject) {
                return gulp.src(appObj.sourceDir + '/Tests/**/*.js')
                    .pipe($.mocha({
                        reporter: 'spec',
                        compilers: {
                            js: $.babelRegister({
                                "presets": ["es2015"]
                            })
                        },
                        config: './mochaConfig.json'
                    })).on('end', resolve).on('error', reject);
            });
        }));
    });

    // default task
    gulp.task('default', ['build-all']);
};

