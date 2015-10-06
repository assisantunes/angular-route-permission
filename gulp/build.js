'use strict';

var path = require('path');
var gulp = require('gulp');
var conf = require('./conf');
var runSequence = require('run-sequence').use(gulp);
var clean = require('gulp-clean');

var $ = require('gulp-load-plugins')({
  pattern: ['gulp-*']
});

gulp.task('scripts', function(){
    return gulp.src([
            path.join(conf.paths.src, '*.js'),
            path.join('!' + conf.paths.src, '*.spec.js'),
            path.join('!' + conf.paths.src, '*.mock.js')
        ])
        .pipe($.concat('angular-route-permission.js'))
        .pipe(gulp.dest(conf.paths.dist))
        .pipe($.rename('angular-route-permission.js'))
        .pipe($.uglify())
        .pipe(gulp.dest(conf.paths.dist));
});

gulp.task('clean', function () {
    return gulp.src(path.join(conf.paths.dist, '/'), {read: false})
        .pipe(clean());
});

gulp.task('build', ['clean'], function(done){
    return runSequence('scripts', done);
});
