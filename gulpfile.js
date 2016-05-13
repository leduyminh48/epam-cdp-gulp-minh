"use strict";
var gulp = require('gulp');
var filendir = require('filendir');
var bower = require('gulp-bower');
var less = require('gulp-less');
var del = require('del');
var util = require('gulp-util');
var cached = require('gulp-cached');
var remember = require('gulp-remember');
var autoprefixer = require('gulp-autoprefixer');
var csso = require('gulp-csso');
var concat = require('gulp-concat');
var gulpif = require('gulp-if');
var imagemin = require('gulp-imagemin');
var spritesmith = require('gulp.spritesmith');
var htmlreplace = require('gulp-html-replace');
var uglify = require('gulp-uglify');
var filter = require('gulp-filter');
var path = require('path');
var source = require('vinyl-source-stream');
var buffer = require('vinyl-buffer');
var browserify = require('browserify');
var sourcemaps = require('gulp-sourcemaps');
var babel = require('gulp-babel');
var plato = require('plato');
var stylelint = require('gulp-stylelint');
var eslint = require('gulp-eslint');
var gulpIf = require('gulp-if');



var argv = require('minimist')(process.argv.slice(2), {
    string: 'env',
    default: {env: process.env.NODE_ENV || 'development'}
});

var conf = {
    less: 'src/less/*.less',
    images: ['src/images/**/*.{png,svg}', '!src/images/icons/**'],
    icons: 'src/images/icons/*.png',
    html: 'src/*.html',
    js: {
        folder: 'src/js',
        main: 'main.js'
    },
    sprite: {
        imgName: 'images/build/sprite.png',
        cssName: 'less/build/sprite.less',
        imgPath: '../images/build/sprite.png'
    },
    build: {
        tmpFolders: '**/build',
        folder: 'build',
        css: 'build/css',
        images: 'build/images',
        js: 'build/js',
        html: 'build',
        compiledJs: 'cdp.js',
        compiledCss: 'cdp.css',
        platoReport: 'reports/plato',
        eslintReport: 'reports/eslint/report.html',
        stylelintReport: 'reports/stylelint/report.json'
    },
    stylelint: {
        reporters: [
            {formatter: 'string', console: true},
            {formatter: 'verbose', save: 'reports/stylelint/report.txt'}
        ],
        syntax: "less"
    }
};

var bootstrap = {
    less: 'bower_components/bootstrap/less/bootstrap.less'
};

gulp.task('bower', function () {
    return bower()
        .pipe(gulp.dest('bower_components'));
});

gulp.task('style', ['stylelint', 'clean', 'bower', 'images'], function () {
    return gulp.src([bootstrap.less, conf.less])
        .pipe(less())
        .pipe(autoprefixer(['last 2 version']))
        .pipe(concat(conf.build.compiledCss))
        // Compress code only on production build
        .pipe(gulpif(argv.env === 'production', csso()))
        .pipe(gulp.dest(conf.build.css));
});

gulp.task('style-watch', function () {
    return gulp.src([bootstrap.less, conf.less])
        .pipe(cached())
        .pipe(less())
        .on('error', errorHandler)
        .pipe(autoprefixer(['last 2 version']))
        .pipe(concat(conf.build.compiledCss))
        .pipe(remember())
        .pipe(gulp.dest(conf.build.css))
});

gulp.task('images', ['clean', 'bower', 'sprite'], function () {
    return gulp.src(conf.images)
        .pipe(gulpif(argv.env === 'production', imagemin()))
        .pipe(gulp.dest(conf.build.images))
});

gulp.task('sprite', ['clean'], function () {
    return gulp.src(conf.icons)
        .pipe(spritesmith(conf.sprite))
        .pipe(gulp.dest('src/'));
});

gulp.task('html', ['clean'], function () {
    return gulp.src(conf.html)
        .pipe(htmlreplace({
            'css': path.relative(conf.build.html, conf.build.css) + '/' + conf.build.compiledCss,
            'js': path.relative(conf.build.html, conf.build.js) + '/' + conf.build.compiledJs,
            'logo': {
                src: 'images/logo_gray-blue_80px.svg',
                tpl: '<img src="%s" alt="Epam logo"/>'
            }
        }))
        .pipe(gulp.dest(conf.build.html));
});

gulp.task('script', ['eslint', 'clean', 'bower'], function () {
    var b = browserify({
        entries: conf.js.folder + '/' + conf.js.main,
        debug: true
    }).transform('debowerify');
    return b.bundle()
        .pipe(source(conf.build.compiledJs))
        .pipe(buffer())
        .pipe(sourcemaps.init({loadMaps: true}))
            .pipe(babel({
                presets: ['es2015']
            }))
            .pipe(gulpif(argv.env === 'production', uglify()))
            .on('error', errorHandler)

        .pipe(sourcemaps.write('./'))
        .pipe(gulp.dest(conf.build.js));
});

gulp.task('eslint', function () {
    return gulp.src(conf.js.folder + "/**/*.js")
        .pipe(eslint({
            fix: true
        }))
        .pipe(eslint.format('html',  function(results) {
            filendir.wa(conf.build.eslintReport, results, (err) => {
                if (!err) {
                    console.log(`ESlint report(s) can be found at \"${conf.build.eslintReport}\"`);
                } else {
                    console.log(err.message);
                }
            });
        }))
        .pipe(gulpIf(function isFixed(file) {
            return file.eslint != null && file.eslint.fixed;
        }, gulp.dest(conf.js.folder)))
        .pipe(eslint.failOnError());
});

gulp.task('stylelint', function () {
    return gulp.src([bootstrap.less, conf.less])
        .pipe(stylelint(conf.stylelint))
});

gulp.task('plato', function () {
    var files = conf.js.folder + '/**/*.js';
    plato.inspect(files, conf.build.platoReport, {}, function () {
        console.log(`Plato report(s) are generated in folder: \"${conf.build.platoReport}\"`)
    });
});

gulp.task('lintAndReport', ['eslint', 'stylelint', 'plato']);


gulp.task('clean', function () {
    return del([conf.build.folder, conf.build.tmpFolders]);
});

gulp.task('build', ['style', 'images', 'html', 'script', 'plato']);

gulp.task('watch', ['build'], function () {
    return gulp.watch(conf.less, ['style-watch']);
});

function errorHandler(error) {
    util.log(util.colors.red('Error'), error.message);

    this.end();
}
