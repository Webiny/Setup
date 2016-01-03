module.exports = function (gulp, opts, $, pipes) {
    var paths = {
        scripts: ["**/*.{js,jsx}", "!Assets/**/*"],
        scriptsDev: ["**/*.{js,jsx}", "!Modules/**/*.{js,jsx}", "!Assets/**/*"],
        styles: ["Assets/styles/**/*.{css,less}"],
        fonts: ["Assets/fonts/**/*", "!Assets/fonts/**/*.{css,less}"],
        images: ["Assets/img/**/*"]
    };

    var parseValues = function (values, sourceAppDir) {
        return $._.map(values, function (value) {
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

            styles: function (sourceAppDir) {
                return parseValues(paths.styles, sourceAppDir);
            },

            fonts: function (sourceAppDir) {
                return parseValues(paths.fonts, sourceAppDir);
            },

            images: function (sourceAppDir) {
                return parseValues(paths.images, sourceAppDir);
            }
        },
        vendorsOrder: [
            "bower_components/system.js/dist/system.js",
            "bower_components/jquery/dist/jquery.js",
            "bower_components/jquery-ui/dist/jquery-ui.js",
            "bower_components/bootstrap/dist/js/bootstrap.js",
            "bower_components/bootstrap/dist/css/bootstrap.css",
            "bower_components/moment/moment.js",
            "bower_components/lodash/lodash.js",
            "custom_components/react/react.js",
            "custom_components/react/react-dom.js",
            "custom_components/react/react-dom-server.js"
        ],
        eslint: {
            "extends": "airbnb",
            "rules": {
                "react/react-in-jsx-scope": 0,
                "react/sort-comp": 0,
                "react/prop-types": 0,
                "indent": 0,
                "comma-dangle": [2, "never"],
                "object-curly-spacing": 0,
                "new-cap": 0,
                "no-param-reassign": 0,
                "radix": [2, "as-needed"],
                "no-console": 0
            },
            "globals": {
                "jQuery": false,
                "$": false,
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
                "isMobile": false
            }
        }
    };
};