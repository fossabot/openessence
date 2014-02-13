'use strict';

// see http://markgoodyear.com/2014/01/getting-started-with-gulp/
var gulp = require('gulp');
var gutil  = require('gulp-util');
var lazypipe = require('lazypipe');
var rjs = require('requirejs');
var sass = require('gulp-ruby-sass');
var autoprefixer = require('gulp-autoprefixer');
var minifycss = require('gulp-minify-css');
var jshint = require('gulp-jshint');
var uglify = require('gulp-uglify');
var imagemin = require('gulp-imagemin');
var svgmin = require('gulp-svgmin');
var rimraf = require('gulp-rimraf'); // preferred over gulp-clean, see https://github.com/peter-vilja/gulp-clean/pull/3
var ngmin = require('gulp-ngmin');
var htmlmin = require('gulp-htmlmin');
var rev = require('gulp-rev');
var inject = require('gulp-inject');
var mocha = require('gulp-mocha');
var open = require('open');
var fs = require('fs');
var mkdirp = require('mkdirp');
var fork = require('child_process').fork;

// add Kibana's grunt tasks
// blocked on https://github.com/gratimax/gulp-grunt/issues/3
// for now you'll have to manually build Kibana
//require('gulp-grunt')(gulp, {
//  base: __dirname + '/kibana',
//  prefix: 'kibana-'
//});

// TODO use gulp-changed

// TODO get livereload working with https://github.com/mollerse/gulp-embedlr

var paths = {
  scripts: ['public/scripts/**/*.js'],
  styles: ['public/styles/**/*.scss'],
  svgs: ['public/images/**/*.svg'],
  html: ['views/**/*.html'],
  partials: ['public/partials/**/*.html'],
  mainJsConcat: 'dist/public/scripts/main.js',
  sassLoadPath: ['public/bower_components'],
  indexHtml: 'views/index.html',
  serverTests: ['test/server/**/test-*.js'],
  clientTests: ['test/client/**/test-*.js'],
  imagesDest: 'dist/public/images'
};

var autoprefix = function () {
  return autoprefixer('last 2 version', 'safari 5', 'ie 8', 'ie 9', 'opera 12.1', 'ios 6', 'android 4');
};

// build CSS for development
gulp.task('sass', function () {
  return gulp.src(paths.styles)
    .pipe(sass({
      style: 'expanded',
      loadPath: paths.sassLoadPath
    }))
    .pipe(autoprefix())
    .pipe(gulp.dest('.tmp/styles'));
});

// build CSS for production
gulp.task('styles', ['clean-styles'], function () {
  // need to depend on clean-styles b/c inject will add all CSS files in dist/styles (including any old ones)
  return gulp.src(paths.styles)
    .pipe(sass({
      style: 'compact',
      loadPath: paths.sassLoadPath
    }))
    .pipe(autoprefix())
    .pipe(minifycss())
    .pipe(rev())
    .pipe(gulp.dest('dist/public/styles'));
});

gulp.task('clean-styles', function () {
  return gulp.src('dist/public/styles', {read: false})
    .pipe(rimraf());
});

gulp.task('rjs', ['clean-scripts'], function (callback) {
  rjs.optimize({
    baseUrl: 'public/scripts',
    mainConfigFile: 'public/scripts/main.js',
    optimize: 'none', // let other tasks uglify
    useStrict: true,
    // use shim loader instead of RequireJS, see https://github.com/jrburke/almond#restrictions
    // if this gives you problems, then just use RequireJS
    name: '../bower_components/almond/almond',
    include: ['main'],
    wrap: true,
    out: function (text) {
      // TODO do this with gulp, i.e. stream of vinyl file objects
      mkdirp('dist/public/scripts', function (err) {
        if (err) {
          callback(err);
          return;
        }
        fs.writeFile(paths.mainJsConcat, text, function (err) {
          callback(err);
        });
      });
    }
  }, function (buildResponse) {
    console.log(buildResponse);
  }, function (err) {
    callback(err);
  });
});

gulp.task('jshint', function () {
  return gulp.src(paths.scripts)
    .pipe(jshint('.jshintrc'))
    .pipe(jshint.reporter('default'));
//    .pipe(jshint.reporter('fail')) // turn this on for pedantry
});

gulp.task('scripts', ['jshint', 'rjs'], function () {
  return gulp.src(paths.mainJsConcat)
    .pipe(rimraf()) // delete rjs temp output
    .pipe(ngmin())
    .pipe(uglify({
      preserveComments: 'some' // preserve license headers
    }))
    .pipe(rev())
    .pipe(gulp.dest('dist/public/scripts'));
});

gulp.task('clean-scripts', function () {
  return gulp.src('dist/public/scripts', {read: false})
    .pipe(rimraf());
});

var imageminTransform = function () {
  return imagemin({
    optimizationLevel: 3,
    progressive: true,
    interlaced: true
  });
};

// Minifying JPGs, PNGs, and GIFs requires native libs which can be annoying to install on Windows, so
// they're all optional dependencies (see https://github.com/kevva/image-min). If the package isn't installed,
// we don't do the minification.

gulp.task('jpgs', function () {
  var pipeline = gulp.src(['public/images/**/*.jpg', 'public/images/**/*.jpeg']);

  // jpegtran-bin can be annoying on Windows, so make it optional
  var canJpeg = (function () {
    try {
      require.resolve('jpegtran-bin');
      return true;
    } catch (e) {
      return false;
    }
  })();
  if (canJpeg) {
    pipeline = pipeline.pipe(imageminTransform());
  } else {
    console.warn('jpegtran-bin not installed. Not minifying jpgs');
  }

  return pipeline.pipe(gulp.dest(paths.imagesDest));
});

gulp.task('pngs', function () {
  var pipeline = gulp.src(['public/images/**/*.png']);
  var canPng = (function () {
    try {
      require.resolve('pngquant-bin');
      return true;
    } catch (e) {
      return false;
    }
  })();
  if (canPng) {
    pipeline = pipeline.pipe(imageminTransform());
  } else {
    console.warn('pngquant-bin not installed. Not minifying pngs');
  }

  return pipeline.pipe(gulp.dest(paths.imagesDest));
});

gulp.task('gifs', function () {
  var pipeline = gulp.src(['public/images/**/*.gif']);
  var canPng = (function () {
    try {
      require.resolve('gifsicle');
      return true;
    } catch (e) {
      return false;
    }
  })();
  if (canPng) {
    pipeline = pipeline.pipe(imageminTransform());
  } else {
    console.warn('gifsicle not installed. Not minifying gifs');
  }

  return pipeline.pipe(gulp.dest(paths.imagesDest));
});

gulp.task('svgs', function () {
  return gulp.src(paths.svgs)
    .pipe(svgmin())
    .pipe(gulp.dest('dist/public/images'));
});

gulp.task('images', ['jpgs', 'pngs', 'gifs', 'svgs']);

gulp.task('partials', function () {
  return gulp.src(paths.partials)
    .pipe(htmlmin({
      collapseWhitespace: true,
      collapseBooleanAttributes: true,
      removeComments: true,
      removeAttributeQuotes: false,
      removeRedundantAttributes: true,
      removeEmptyAttributes: true,
      removeOptionalTags: false // removing is probably a bad idea with partial docs
    }))
    .pipe(gulp.dest('dist/public/partials'));
});

gulp.task('inject', ['styles', 'scripts'], function () {
  // TODO clean up when https://github.com/klei/gulp-inject/issues/9 is resolved
  return gulp.src(['dist/public/scripts/**/*.js', 'dist/public/styles/**/*.css'], {read: false})
    .pipe(inject(paths.indexHtml, {
      ignorePath: '/dist'
    }))
    .pipe(gulp.dest('dist/views'));
});

gulp.task('html', ['inject'], function () {
  return gulp.src(['views/**/*.html', '!' + paths.indexHtml, 'dist/views/**/*.html'])
    .pipe(htmlmin({
      collapseWhitespace: true,
      collapseBooleanAttributes: true,
      removeComments: true,
      removeAttributeQuotes: false,
      removeRedundantAttributes: true,
      useShortDoctype: true, // enforces what we already do
      removeEmptyAttributes: true,
      removeOptionalTags: true
    }))
    .pipe(gulp.dest('dist/views'));
});

//gulp.task('watch', function () {
//  // TODO get this working when manually rebuilding gets annoying enough
//});

gulp.task('clean', function () {
  return gulp.src(['dist', '.tmp'], {read: false})
    .pipe(rimraf());
});

gulp.task('build', ['images', 'partials', 'html'/*, 'kibana-build'*/]);

gulp.task('server', ['build'], function (callback) {
  var child = fork(__dirname + '/server.js', [], {
    env: {
      NODE_ENV: 'production'
    }
  });
  child.on('message', function (m) {
    if (m.started) {
      gutil.log('Opening ' + m.url);
      open(m.url);
    }
  });
  child.on('error', callback);
  child.on('exit', function () {
    callback(null);
  });
});

var mochaTransform = lazypipe()
  .pipe(function () {
    return mocha({
      ui: 'bdd',
      reporter: 'nyan'
    });
  });

// if we want integration tests, we can split this into server-unit-tests and server-integration tests
gulp.task('server-tests', function () {
  return gulp.src(paths.serverTests, {read: false})
    .pipe(mochaTransform());
});

// these are unit tests, integration tests would use Karma and/or CasperJS as the test runner
var clientTests = function () {
  return gulp.src(paths.clientTests, {read: false})
    .pipe(mochaTransform());
};

gulp.task('client-tests', function () {
  return clientTests();
});

// run tests in series so output isn't garbage
gulp.task('tests', ['server-tests'], function () {
  gutil.log('Running client-tests...');
  var pipe = clientTests();
  gutil.log('Finished client-tests');
  return pipe;
});

gulp.task('default', ['build']);
