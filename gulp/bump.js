'use strict';

var gulp = require('gulp');
var argv = require('yargs').argv;
var git = require('gulp-git');
var bump = require('gulp-bump');
var tag_version = require('gulp-tag-version');
var runSequence = require('run-sequence').use(gulp);
var path =  require('path');


/**
 * Bumping version number and tagging the repository with it.
 * You can use the commands
 *
 *     gulp patch     # makes v0.1.0 → v0.1.1
 *     gulp feature   # makes v0.1.1 → v0.2.0
 *     gulp release   # makes v0.2.1 → v1.0.0
 */
gulp.task('patch', function(done) { inc('patch', done); })
gulp.task('feature', function(done) { inc('minor', done); })
gulp.task('release', function(done) { inc('major', done); })
function inc(importance, done) {
  bump_importance = importance;

  // Build, then commit changes and tag it
  return runSequence(
    'bump',
    'flush-requirejs-package-json-cache',
    'build',
    'commit-bump-build',
    'tag-version',
    function(){
      bump_importance = null;
      done();
    });
}


/**
 * Bump version number
 */
var bump_importance = null;
gulp.task('bump', function(){
  if(bump_importance===null) return;

  // Get all the files to bump version in
  return gulp.src(['./package.json', './bower.json'])
    // bump the version number in those files
    .pipe(bump({type: bump_importance}))
    // save it back to filesystem
    .pipe(gulp.dest('./'));
})


/**
 * Tag package version in the repository
 */
gulp.task('tag-version', function(){
  return gulp.src(['./package.json']).pipe(tag_version());
})


/**
 * Commit bump + build
 */
gulp.task('commit-bump-build', function(){
  return gulp.src([ './package.json', './bower.json', './dist/*'])
    .pipe(git.add({quiet:true}))
    .pipe(git.commit('[BOT] Build and bump versions'));
});


/**
 * Task to flush the cache for the package.json on the requirejs
 * This is a hack to force reload the package.json
 * with the new version bumped before if necessary
 */
gulp.task('flush-requirejs-package-json-cache', function(done){
  delete require.cache[path.join(__dirname, '../package.json')];
  done();
});
