//This is a workaround for bugs with NPM v2 and should be removed with NPM v3+
//This is to get around this issue https://github.com/electron-userland/electron-prebuilt/issues/210
//Also came up with is-property: https://github.com/electron-userland/electron-prebuilt/issues/40

var devDependencies = ['rimraf', 'is-property@^1.0.0'];
if(process.env.NODE_ENV !== 'production') {
    require('child_process').execSync('npm install ' + devDependencies.join(' '));
}
