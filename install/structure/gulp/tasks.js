module.exports = function (gulp, opts, $, pipes) {
    var events = ['add', 'change', 'unlink'];

    function watchApp(appObj) {
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

        $.watch(opts.config.paths.watchAssets(appObj), {read: false, events: events}, function (file) {
            if ((/\.(css|scss|less)$/i).test(file.path)) {
                return pipes.buildStyles(appObj).pipe($.webinyAssets.update(appObj)).pipe($.livereload());
            }

            if ($._.endsWith(file.path, '/bower.json') || $._.endsWith(file.path, '.js')) {
                return pipes.buildVendorScripts(appObj).pipe($.webinyAssets.update(appObj)).pipe($.livereload());
            }

            if ($._.includes(file.path, '/images/')) {
                $.del(appObj.buildDir + '/images');
                return pipes.buildImages(appObj);
            }

            if ($._.endsWith(file.path, 'Assets.yaml')) {
                appObj.reloadAssetsConfig();
            }

            return pipes.buildAssets(appObj).pipe($.webinyAssets.update(appObj)).pipe($.livereload());
        });
    }

    // removes all compiled files
    gulp.task('clean', function () {
        return Promise.all(opts.apps.map(function (app) {
            var deferred = $.q.defer();
            $.del(app.buildDir, function () {
                deferred.resolve();
            });
            return deferred.promise;
        }));
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
        return Promise.all(opts.apps.map(function (app) {
            return pipes.buildApp(app);
        }));

    });

    // cleans and builds all apps
    gulp.task('build-all', ['clean-all'], function () {
        $.webiny.showAppsReport();
        return Promise.all(opts.apps.map(function (app) {
            return pipes.buildApp(app);
        }));
    });

    // watch live changes
    gulp.task('watch-all', ['build-all'], function () {
        $.livereload.listen(35729);
        opts.apps.map(watchApp);
    });

    // watch live changes
    gulp.task('watch', ['build'], function () {
        $.livereload.listen(35729);
        opts.apps.map(watchApp);
    });

    gulp.task('release', function () {
        var env = opts.production ? 'production' : 'development';
        var folder = opts.folder ? opts.folder : 'development';
        var paths = [
            'Apps/**/*',
            '!Apps/**/Js/**/*',
            '!Apps/**/*.git',
            'Configs/**/*.yaml',
            'public_html/build/' + env + '/**/*',
            'public_html/index.{php,html}',
            'vendor/**/*.{php,crt}',
            '!vendor/**/[tT]est*/**/*',
            '!vendor/**/*.git'
        ];

        var zipName = env + '-' + $.moment().format('YYYYMMDD-HHmmss');
        var shell = opts.host ? $.shell([
            'bash gulp/deploy.sh <%= file.path %> ' + opts.host + ' ' + folder,
            'rm <%= file.path %>'
        ]) : $.util.noop();

        return gulp.src(paths, {base: '.'})
            .pipe($.count('## files added to archive'))
            .pipe($.zip(zipName + '.zip'))
            .pipe(gulp.dest('releases'))
            .pipe($.print(function (filepath) {
                return 'Created release archive: ' + filepath;
            }))
            .pipe(shell)
    });

    gulp.task('revert', $.shell.task([
        'bash gulp/revert.sh ' + opts.host + ' ' + (opts.folder ? opts.folder : 'development')
    ]));

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

