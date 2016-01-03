module.exports = function (gulp, opts, $) {

	function getFolders(dir) {
		try{
			return $.fs.readdirSync(dir).filter(function (file) {
				return $.fs.statSync($.path.join(dir, file)).isDirectory();
			});
		} catch (e) {
			return [];
		}
	}

	function readJsApps(app, jsApp, dir) {
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

			jsApps.push({
				name: app + '.' + jsAppFolder,
				buildDir: opts.buildDir + app + '/' + jsAppFolder,
				sourceDir: dir + '/' + jsAppFolder,
				modules: modules
			});
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
				var dir = './Apps/' + app + '/Js';
				readJsApps(app, jsApp, dir).map(function (appObj) {
					jsApps.push(appObj);
				});
			});

			return jsApps;
		}
	};
};