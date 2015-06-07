var gulp = require('gulp'),
    browserify = require('gulp-browserify'),
    size = require('gulp-size'),
    clean = require('gulp-clean');

// tasks
gulp.task('transform', function () {
  return gulp.src('./public/scripts/main.js')
    .pipe(browserify())
    .pipe(gulp.dest('./public/dist'))
    .pipe(size());
});

gulp.task('clean', function () {
  return gulp.src(['./public/dist'], {read: false})
    .pipe(clean());
});

gulp.task('default', ['clean'], function () {
  gulp.start('transform');
  gulp.watch('./public/scripts/main.js', ['transform']);
});
