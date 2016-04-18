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
        },
        eslint: {
            "extends": "airbnb",
            "rules": {
                "react/no-multi-comp": 0,
                "react/react-in-jsx-scope": 0,
                "react/sort-comp": 0,
                "react/prop-types": 0,
                "react/jsx-boolean-value": 0,
                "indent": 0,
                "comma-dangle": [2, "never"],
                "object-curly-spacing": 0,
                "new-cap": 0,
                "no-param-reassign": 0,
                "radix": [2, "as-needed"],
                "no-console": 0,
                "eol-last": 0,
                "dot-notation": 0,
                "no-script-url": 0
            },
            "globals": {
                "jQuery": false,
                "$": false,
                "Cookies": false,
                "Webiny": true,
                "WebinyBootstrap": true,
                "React": false,
                "ReactDOM": false,
                "ReactDOMServer": false,
                "Bottle": false,
                "Baobab": false,
                "_": false,
                "Q": false,
                "axios": false,
                "moment": false,
                "accounting": false,
                "_apiUrl": true,
                "isMobile": false,
                "filesize": true
            }
        }
    };
};