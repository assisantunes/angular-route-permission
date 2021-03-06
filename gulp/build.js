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
            path.join(conf.paths.src, 'middleware.js'),
            path.join(conf.paths.src, 'exceptions.js'),
            path.join(conf.paths.src, 'utils.js'),
            path.join(conf.paths.src, 'store.js'),
            path.join(conf.paths.src, 'permissions.js'),
            path.join(conf.paths.src, 'provider.js'),
        ], { base:conf.paths.src })
        .pipe($.concat('angular-route-permission.js'))
        .pipe(gulp.dest(conf.paths.dist))
        .pipe($.rename('angular-route-permission.js'))
        .pipe($.ngAnnotate())
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
