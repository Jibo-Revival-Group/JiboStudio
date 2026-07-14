(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.parserDownload = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var fs = require("fs-extra");
var path = require("path");
var nugget = require("nugget");
var extractZip = require("extract-zip");
var envPaths = require("env-paths");
var uuid = require("uuid");
var ParserDownload = (function () {
    function ParserDownload(optionsOrVersion) {
        var options;
        if (typeof optionsOrVersion === "string") {
            options = { version: optionsOrVersion };
        }
        else {
            options = optionsOrVersion;
        }
        options = Object.assign({}, {
            force32: false,
            rename: false,
            verbose: false,
            version: '',
            type: '',
            logger: console.log.bind(console),
            dir: 'parser',
            url: 'https://github.com/jiborobot/jibo-parser/releases/download/'
        }, options || {});
        this.options = options;
    }
    ParserDownload.prototype.start = function () {
        var _this = this;
        return new Promise(function (resolve, reject) {
            var options = _this.options;
            if (!options.version) {
                return reject('Must specify a \"version\" to download');
            }
            if (options.type === 'auto') {
                options.type = process.versions.modules;
            }
            var arch = process.arch;
            if (process.platform === 'win32' && options.force32) {
                arch = 'ia32';
            }
            _this.name = 'jibo-nlu-js';
            _this.archiveName = _this.name + '-v' +
                options.version + '-' +
                process.platform + '-' +
                arch +
                (options.type ? '-' + options.type : '') +
                '.zip';
            _this.url = options.url + "v" + options.version + "/" + _this.archiveName;
            _this.cacheDir = envPaths(_this.name).cache;
            _this.tempDir = path.join(_this.cacheDir, uuid());
            _this.outputDir = path.resolve(options.dir);
            _this.versionPath = path.join(_this.outputDir, _this.name + '.txt');
            _this.archivePath = path.join(_this.cacheDir, _this.archiveName);
            if (fs.existsSync(_this.versionPath) && fs.readFileSync(_this.versionPath, 'utf8') === _this.archiveName) {
                _this.log("Current target matches downloaded. Skipping.");
                return resolve();
            }
            if (!fs.existsSync(_this.cacheDir)) {
                _this.log("Creating global cache directory " + _this.cacheDir);
                fs.mkdirsSync(_this.cacheDir);
            }
            if (fs.existsSync(_this.archivePath)) {
                _this.log("Using existing download from cache.");
                _this.extract()
                    .then(resolve)
                    .catch(reject);
            }
            else {
                _this.download()
                    .then(function () {
                    _this.extract()
                        .then(resolve)
                        .catch(reject);
                })
                    .catch(reject);
            }
        });
    };
    ParserDownload.prototype.log = function (message) {
        if (this.options.verbose) {
            this.options.logger(message);
        }
    };
    ParserDownload.prototype.extract = function () {
        var _this = this;
        return new Promise(function (resolve, reject) {
            _this.log("Extracting archive..." + _this.archiveName);
            try {
                fs.removeSync(_this.outputDir);
                fs.removeSync(_this.tempDir);
            }
            catch (e) {
            }
            _this.log("Creating new target folder: " + _this.outputDir);
            fs.mkdirsSync(_this.outputDir);
            fs.mkdirsSync(_this.tempDir);
            extractZip(_this.archivePath, { dir: _this.tempDir }, function (err) {
                if (err) {
                    return reject(err);
                }
                fs.copySync(path.join(_this.tempDir, _this.name), _this.outputDir, { clobber: true });
                fs.writeFileSync(_this.versionPath, _this.archiveName, 'utf8');
                fs.removeSync(_this.tempDir);
                _this.log("Done with extract.");
                if (_this.options.rename) {
                    _this.rename();
                }
                resolve();
            });
        });
    };
    ParserDownload.prototype.download = function () {
        var _this = this;
        var options = {
            target: this.archiveName,
            dir: this.cacheDir,
            quiet: !('clearLine' in process.stdout),
            verbose: true,
            strictSSL: true,
            resume: true
        };
        return new Promise(function (resolve, reject) {
            _this.log("Downloading from URL " + _this.url);
            nugget(_this.url, options, function (err) {
                if (err) {
                    return reject(err);
                }
                _this.log("Download complete.");
                resolve();
            });
        });
    };
    ParserDownload.prototype.rename = function () {
        var parserRoot = path.join(this.outputDir, 'build', 'Release');
        this.log("Renaming 'jsjibonlu.node' to 'jsjibonlu.jibo'");
        fs.renameSync(path.join(parserRoot, 'jsjibonlu.node'), path.join(parserRoot, 'jsjibonlu.jibo'));
    };
    return ParserDownload;
}());
exports.default = ParserDownload;

},{"env-paths":undefined,"extract-zip":undefined,"fs-extra":undefined,"nugget":undefined,"path":undefined,"uuid":undefined}],2:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var ParserDownload_1 = require("./ParserDownload");
var minimist = require("minimist");
var path = require("path");
var chalk = require("chalk");
function default_1() {
    var args = minimist(process.argv.slice(2), {
        boolean: ['force32', 'rename', 'verbose'],
        string: ['version', 'url', 'type', 'dir', 'temp'],
        alias: {
            f: 'force32',
            r: 'rename',
            v: 'version',
            u: 'url',
            t: 'type',
            d: 'dir',
            c: 'temp',
            b: 'verbose'
        }
    });
    var packageInfo;
    try {
        packageInfo = require(path.join(process.cwd(), 'package'));
    }
    catch (e) {
    }
    if (packageInfo && packageInfo.parser) {
        if (typeof packageInfo.parser === "string") {
            packageInfo.parser = {
                version: packageInfo.parser
            };
        }
        args = Object.assign({}, packageInfo.parser, args);
    }
    args.logger = function (message) {
        console.log(chalk.gray('[parser-download]'), message);
    };
    var download = new ParserDownload_1.default(args);
    download.start()
        .catch(function (err) {
        console.log(chalk.red("ERROR: " + err));
        process.exit(1);
    });
}
exports.default = default_1;
;

},{"./ParserDownload":1,"chalk":undefined,"minimist":undefined,"path":undefined}],3:[function(require,module,exports){
"use strict";
var cli_1 = require("./cli");
var ParserDownload_1 = require("./ParserDownload");
function parserDownload(optionsOrVersion, callback) {
    var download = new ParserDownload_1.default(optionsOrVersion);
    download.start()
        .then(function () {
        callback();
    })
        .catch(callback);
    return download;
}
parserDownload.cli = cli_1.default;
module.exports = parserDownload;

},{"./ParserDownload":1,"./cli":2}]},{},[3])(3)
});

//# sourceMappingURL=parser-download.js.map
