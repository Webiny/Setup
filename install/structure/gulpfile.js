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
 * --es-lint - turn ESLint on or off (ESLint is ON by default)
 */
require('events').EventEmitter.prototype._maxListeners = 100;
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
$.cssImport = require('gulp-cssimport');
$.babelRegister = require('babel-register');

// Get CLI arguments: gulp build-app --app Backend --production
var opts = require('yargs').argv;

if (!opts.esLint) {
    opts.esLint = true;
}

opts.buildDir = './public_html/build/production/';
if (!opts.production) {
    opts.production = false;
    opts.buildDir = './public_html/build/development/';
}

// Import config
opts.config = require('./gulp/config.js')(gulp, opts, $);

// Import webiny tools
$.webiny = require('./gulp/webiny.js')(gulp, opts, $);
$.webinyAssets = require('./gulp/webinyAssets.js')(gulp, opts, $);

// Load app objects
opts.apps = [];
if ($._.isString(opts.app)) {
    var parts = opts.app.split('.');
    opts.apps = $.webiny.getApps(parts[0], parts[1] || null);
} else if ($._.isArray(opts.app)) {
    opts.app.map(function (app) {
        var parts = app.split('.');
        $.webiny.getApps(parts[0], parts[1] || null).map(function (a) {
            opts.apps.push(a);
        });
    });
}

if (opts.apps.length == 0) {
    opts.apps = $.webiny.getApps();
}

var pipes = require('./gulp/pipes')(gulp, opts, $);
var tasks = require('./gulp/tasks')(gulp, opts, $, pipes);
