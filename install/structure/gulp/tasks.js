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
		return pipes.buildApp(opts.app, opts.jsApp);
	});

	// cleans and builds all apps
	gulp.task('build-all', ['clean-all'], function () {
        return pipes.buildApp();
	});

	// watch live changes
	gulp.task('watch-all', ['build-all'], function () {

		$.livereload.listen(35729);

		$.webiny.getApps().map(function (appObj) {
			if (opts.production) {
				$.watch(opts.config.paths.scripts(appObj.sourceDir), {read: false}, function () {
					$.util.log('Re-building ' + appObj.name + ' app scripts...');
					return pipes.buildAppScripts(appObj).pipe($.livereload());
				});
			} else {
				// Watch each module separately
				appObj.modules.map(function (moduleObj) {
					$.watch(moduleObj.scripts, {read: false}, function () {
						$.util.log('Re-building ' + moduleObj.name + ' module...');
						return pipes.buildModuleScripts(appObj, moduleObj).pipe($.livereload());
					});
				});

				// Watch remaining scripts
				$.watch(opts.config.paths.scriptsDev(appObj.sourceDir), {read: false}, function () {
					$.util.log('Re-building ' + appObj.name + ' app scripts...');
					return pipes.buildRemainingAppScripts(appObj).pipe($.livereload());
				});
			}

			$.watch(opts.config.paths.styles(appObj.sourceDir), {read: false}, function () {
				$.util.log('Re-building ' + appObj.name + ' styles...');
				return pipes.buildStyles(appObj).pipe($.livereload());
			});
		});
	});

	// default task
	gulp.task('default', ['build-all']);
};

