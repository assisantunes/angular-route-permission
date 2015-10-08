'use strict';

var path = require('path');
var gulp = require('gulp');
var conf = require('./conf');


gulp.task('watch', ['build'], function () {
  gulp.watch([path.join(conf.paths.src, '*.js')], ['build']);
});
