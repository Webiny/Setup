/* eslint-disable */
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
        $.webiny.showAppsReport(opts.apps);
        return Promise.all(opts.apps.map(function (app) {
            return pipes.buildApp(app);
        }));

    });

    // cleans and builds all apps
    gulp.task('build-all', ['clean-all'], function () {
        $.webiny.showAppsReport(opts.apps);
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
            .pipe(shell);
    });

    gulp.task('revert', $.shell.task([
        'bash gulp/revert.sh ' + opts.host + ' ' + (opts.folder ? opts.folder : 'development')
    ]));

    // Run tests
    gulp.task('run-tests', function () {
        return Promise.all(opts.apps.map(function (appObj) {
            return new Promise(function (resolve, reject) {
                $.glob(appObj.sourceDir + '/Tests/*.js', function (er, files) {
                    if (files.length < 1) {
                        return reject();
                    }

                    return gulp.src(files)
                        .pipe($.count('Running ## test(s) for ' + $.util.colors.magenta(appObj.name)))
                        .pipe($.mocha({
                            reporter: 'spec',
                            compilers: {
                                js: $.babelRegister({
                                    "presets": ["es2015"],
                                    resolveModuleSource: function (source) {
                                        if (source === 'Webiny/TestSuite') {
                                            return process.env.PWD + '/Apps/Core/Js/Webiny/Modules/Core/TestLib/TestSuite';
                                        }
                                        return source;
                                    }
                                })
                            }
                        }))
                        .on('end', resolve).on('error', reject);
                });
            });
        }));
    });

    // default task
    gulp.task('default', function (done) {
        var choices = [
            {name: 'All', value: 'all'},
            new $.inquirer.Separator()
        ];
        var apps = $.webiny.getApps();
        apps.map(function (app) {
            choices.push({
                name: app.name,
                value: app
            });
        });
        $.inquirer.prompt([{
            type: 'list',
            name: 'task',
            message: 'What would you like to do?',
            choices: [
                {name: 'Build', value: 'build'},
                {name: 'Watch', value: 'watch'},
                {name: 'Test', value: 'run-tests'}
            ],
            filter: function (val) {
                return val.toLowerCase();
            }
        }]).then(function (taskAnswer) {
            $.inquirer.prompt([{
                type: 'checkbox',
                name: 'apps',
                message: 'Select apps',
                choices: choices
            }]).then(function (appAnswer) {
                if (appAnswer.apps.length == 1 && appAnswer.apps[0] == 'all') {
                    opts.apps = apps;
                } else {
                    opts.apps = appAnswer.apps;
                }
                gulp.start(taskAnswer.task);
                done();
            });
        });
    });
};

