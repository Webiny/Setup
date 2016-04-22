module.exports = function (gulp, opts, $, pipes) {
    var paths = {
        scripts: ["**/*.{js,jsx}", "!Assets/**/*"],
        scriptsDev: ["**/*.{js,jsx}", "!Modules/**/*.{js,jsx}", "!Assets/**/*"],
        fonts: ["Assets/fonts/**/*", "!Assets/fonts/**/*.{css,less}", "Assets/bower_components/**/*.{eot,svg,ttf,woff,woff2}"],
        images: ["Assets/images/**/*"]
    };

    var parseValues = function (values, sourceAppDir) {
        return $._.map(values, function (value) {
            sourceAppDir = _.trimLeft(sourceAppDir, './');
            var path = sourceAppDir + "/" + value;
            if ($._.startsWith(value, "!")) {
                path = "!" + sourceAppDir + "/" + $._.trimLeft(value, "!");
            }
            return path;
        });
    };

    return {
        paths: {
            scripts: function (sourceAppDir) {
                return parseValues(paths.scripts, sourceAppDir);
            },

            scriptsDev: function (sourceAppDir) {
                return parseValues(paths.scriptsDev, sourceAppDir);
            },

            styles: function (appObj) {
                return appObj.sourceDir + '/Assets/' + appObj.assets.getStyles();
            },

            watchStyles: function (appObj) {
                return appObj.sourceDir + '/Assets/styles/**/*.{css,less,scss}';
            },

            fonts: function (sourceAppDir) {
                return parseValues(paths.fonts, sourceAppDir);
            },

            images: function (sourceAppDir) {
                return parseValues(paths.images, sourceAppDir);
            }
        }
    };
};