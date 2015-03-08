var _ = require('lodash');
var gulp = require('gulp');
var reactify = require('reactify');
var to5 = require('6to5-browserify');
var browserify = require('browserify');
var source = require('vinyl-source-stream');
var gutil = require('gulp-util');
var notify = require('notify-send');
var sass = require('gulp-sass');
var plumber = require('gulp-plumber');
var prefix = require('gulp-autoprefixer');
var rename = require('gulp-rename');

var notifySend = _.debounce(function(options) {
  notify[options.level || 'low']
    .timeout(options.timeout || 1000)
    .notify(
      options.subject || '',
      options.message || ''
    );
}, 10000, {
  leading: true,
  trailing: false
});

function error(task) {
  return function(err) {
    gutil.log(gutil.colors.red(err));
    notifySend({
      subject: '[' + task + '] ' + (err.name || 'Error'),
      message: err.message
    });
    this.emit('end');
  };
}

gulp.task('scripts', function() {

  var scripts_input = [
      './app/scripts/app.js'
    ];
    
  var scripts_output_dir = './public/js/';
  var script_output = 'home.js';

  var main = browserify({
    entries: scripts_input
  });

  main.transform(reactify);
  main.transform(to5);

  return main.bundle()
    .on('error', error('scripts'))
    .pipe(source(script_output))
    .pipe(gulp.dest(scripts_output_dir));
});

gulp.task('styles', function() {

  var styles_input = [
    './app/styles/app.scss'
  ];
  
  var script_output = './public/css/';

  return gulp.src(styles_input)
    .pipe(plumber({
      errorHandler: error('styles')
    }))
    .pipe(sass())
    .pipe(prefix('last 10 version'))
    .pipe(rename('home.css'))
    .pipe(gulp.dest(script_output));
});

gulp.task('assets', function() {
  var asset_input = [
    './app/assets/*'
  ];
  
  var asset_output = './public/assets/';

  return gulp.src(asset_input)
    .pipe(gulp.dest(asset_output));
});

gulp.task('build', [
  'scripts',
  'styles',
  'assets'
]);

gulp.task('default', [
  'build',
]);
