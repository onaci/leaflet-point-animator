const gulp = require('gulp');
const babel = require('rollup-plugin-babel');
const rollup = require('rollup');
const commonjs = require('rollup-plugin-commonjs');
const webWorkerLoader = require('rollup-plugin-web-worker-loader');

// Concatenate & Minify src and dependencies
gulp.task('scripts', function () {

	return rollup.rollup({
		input: './src/js/L.PointAnimatorLayer.js',
		output: {
			format: 'umd',
			name: 'leaflet-point-animator'
		},
		plugins: [
			babel({
				exclude: 'node_modules/**' // only transpile our source code
			}),
			commonjs({
				include:
					'node_modules/**'
			}),
			webWorkerLoader({ inline: false, loadPath: '/dist' })
		]
	})

	// and output to ./dist/app.js as normal.
	.then(bundle => {
		return bundle.write({
			file: './dist/leaflet-point-animator.js',
			format: 'umd',
			name: 'leaflet-point-animator',
			sourcemap: true
		});
	});

});

// gulp.task('copy-workers', function() {
//   return gulp.src('./src/js/*Worker.js')
//     .pipe(gulp.dest('./dist'));
// });

// Watch Files For Changes
gulp.task('watch', function (done) {
	gulp.watch('src/js/*.js', gulp.series('scripts'));
	done();
});

// Default Task
gulp.task('default', gulp.series('scripts', 'watch'));