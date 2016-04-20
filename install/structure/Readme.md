Gulp Build
===================
1. Every Apps subfolder is treated as a separate application.
2. Each JS subfolder of an App is built separately
3. Development Builds are stored in `/public_html/dev/{app}/{version}/{jsApp}/app.min.js`
4. Production Builds are stored in `/public_html/prod/{app}/{version}/{jsApp}/app.min.js`
5. Development build builds each app module into a separate `{module}.min.js` to speed up development process
6. `gulp watch-all` runs a dev build and watches each app separately