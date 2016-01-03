var gulp = require('gulp');
var $ = require('gulp-load-plugins')();
$.chalk = require('chalk');
$.del = require('del');
$.lazypipe = require('lazypipe');
$.es = require('event-stream');
$.q = require('q');
$._ = _ = require('lodash');
$.livereload = require('gulp-livereload');
$.fs = require('fs');
$.path = require('path');
$.mainBowerFiles = require('main-bower-files');

// Get CLI arguments: gulp build-app --app Backend --production
var opts = require('yargs').argv;

if (!opts.app) {
	opts.app = 'Core';
}

// If specific JS app is requested
if (opts.app.indexOf('.') > -1) {
	var parts = opts.app.split('.');
	opts.app = parts[0];
	opts.jsApp = parts[1];
}

opts.buildDir = './public_html/build/production/';
if (!opts.production) {
	opts.production = false;
	opts.buildDir = './public_html/build/development/';
}

// Import pipes
var pipes = require('./gulp/pipes')(gulp, opts, $);

// Import config
opts.config = require('./gulp/config.js')(gulp, opts, $, pipes);

// Import webiny tools
$.webiny = require('./gulp/webiny.js')(gulp, opts, $);
$.webinyAssets = require('./gulp/webinyAssets.js')(gulp, opts, $);

// Import tasks
var tasks = require('./gulp/tasks')(gulp, opts, $, pipes);