'use strict';
var uglify = require('uglify-es');
var minifier = require('./minifier');

module.exports = function (opts) {
  return minifier(opts, uglify);
};
