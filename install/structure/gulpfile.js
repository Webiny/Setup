/**
 * DEVELOPMENT:
 * By default, everything is built in development mode, meaning minify and uglify are not executed.
 * In development, each app module is built in a separate file, to speed up partial builds while developing.
 * Also, revisioning is disabled in development.
 * If you want to enable revisioning, see OPTIONS below.
 *
 * PRODUCTION:
 * In production, everything is concatenated into app.js and vendors.js (with revision hash).
 * You can not disable revisioning in production builds.
 *
 * OPTIONS:
 * --app - specify an app to watch:
 *          ex1: --app Core
 *          ex2: --app Core.Webiny
 *
 * --production - turn on production build: will minify CSS and uglify JS (very slow)
 * --js-rev - turn on JS revisioning (If --production, revisioning is ON by default)
 * --css-rev - turn on JS revisioning (If --production, revisioning is ON by default)
 */

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