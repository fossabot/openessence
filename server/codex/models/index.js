'use strict';

var glob = require('glob');
var path = require('path');

module.exports = function () {
  return glob.sync(__dirname + '/*.js')
    .filter(function (filename) {
      // exclude current file
      return path.basename(filename) !== path.basename(__filename);
    })
    .reduce(function (models, filename) {
      var name = path.basename(filename, '.js');
      models[name] = require('./' + name);
      return models;
    }, {});
};
