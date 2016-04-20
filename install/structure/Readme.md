Gulp Build
===================
1. Every Apps subfolder is treated as a separate application.
2. Each JS subfolder of an App is built separately
3. Development Builds are stored in `/public_html/dev/{app}/{jsApp}/app.min.js`
4. Production Builds are stored in `/public_html/prod/{app}/{jsApp}/app.min.js`
5. Development build builds each app module into a separate `{module}.min.js` to speed up development process
6. `gulp watch` runs a dev build and watches each app separately
7. `gulp build --production` builds a production version of all apps
8. `gulp build` builds a development version of all apps

Change push 1
