/**
 * @author Adam Meadows [@job13er](https://github.com/job13er)
 * @copyright 2015 Ciena Corporation. All rights reserved.
 */

'use strict';

const _ = require('lodash');
const fs = require('fs');
const matchdep = require('matchdep');
const path = require('path');
const rimraf = require('rimraf');
const webpack = require('webpack');

const configDir = path.join(__dirname, '../../config');
const webpackLoaders = require(path.join(configDir, 'webpack/loaders'));
const webpackResolve = require(path.join(configDir, 'webpack/resolve'));
const webpackPlugins = require(path.join(configDir, 'webpack/karma-plugins'));

const USE_SOURCE_MAPS = process.env.MAPS === 'on';

const BEAKER_DIR = (process.env.IS_BEAKER === '1') ? './' : 'node_modules/beaker';

module.exports = {

    /**
     * Move all coverage data up one level (it's grouped under a directory named for the browser used)
     * i.e, coverage/PhantomJS 1.9.7 (Linux)/index.html -> coverage/index.html
     * @param {String} coverageDir - the full path to the coverage dir
     * @param {Function} logFn - the logging function to use
     */
    moveCoverageUp(coverageDir, logFn) {
        var subDir = fs.readdirSync(coverageDir)[0];
        var fullSubDir = path.join(coverageDir, subDir);

        if (logFn) {
            logFn('found coverage directory at: ' + fullSubDir);
        }

        _.forEach(fs.readdirSync(fullSubDir), function (file) {
            var dest = path.join(coverageDir, file);
            rimraf.sync(dest);
            fs.renameSync(path.join(fullSubDir, file), dest);
        });

        rimraf.sync(fullSubDir);

        if (logFn) {
            logFn('moved all files to: ' + coverageDir);
        }
    },

    /**
     * Initialize the helper module with the grunt instance
     * @param {Object} grunt - the grunt instance loaded in the Gruntfile
     */
    init(grunt) {

        // load beaker tasks
        var gruntTasks = matchdep.filterAll('grunt-*');
        _.without(gruntTasks, 'grunt-cli').forEach(grunt.loadNpmTasks);

        // load local tasks
        var localGruntTasks = matchdep.filterAll('grunt-*', path.join(process.cwd(), 'package.json'));
        _.without(localGruntTasks, 'grunt-cli').forEach(grunt.loadNpmTasks);

        var webpackConfig = require(path.join(process.cwd(), 'webpack.config.js'));
        var WEBPACK_PORT = grunt.option('port') || process.env.WEBPACK_PORT || 8080;

        // initial grunt config
        grunt.initConfig({

            filenames: {
                src: [
                    'src/**/*.*',
                    'spec/**/*.*',
                    'demo/**/*.*',
                    '!**/Gruntfile.js',
                    '!node_modules/**',
                ],

                options: {
                    valid: /^_?[a-z0-9\-\.]+\.([^\.]+)$/,
                },
            },

            karma: {
                options: {
                    configFile: path.join(BEAKER_DIR, 'config/karma/config.js'),
                },

                unit: {
                    background: true,
                },

                ci: {
                    singleRun: true,
                },

                coverage: {
                    singleRun: true,

                    reporters: ['progress', 'coverage'],

                    coverageReporter: {
                        reporters: [
                            {
                                type: 'text-summary',
                            },
                            {
                                type: 'html',
                                dir: path.join(process.cwd(), 'coverage'),
                            },
                            {
                                type: 'lcovonly',
                            },
                        ],
                    },

                    webpack: {
                        module: {
                            loaders: webpackLoaders,

                            preLoaders: [
                                {
                                    test: /\.js$/,
                                    loader: path.join(process.cwd(), BEAKER_DIR, 'config/karma/self-loader.js'),
                                },
                                {
                                    test: /\.js$/,
                                    exclude: /(spec|node_modules|karma)/,
                                    loader: 'isparta?{ babel: {plugins: ["rewire"] } }',
                                },
                            ],
                        },
                        plugins: webpackPlugins,
                        resolve: webpackResolve,
                    },
                },
            },

            webpack: {
                options: webpackConfig,
                build: {
                    plugins: webpackConfig.plugins.concat(
                        new webpack.optimize.DedupePlugin(),
                        new webpack.optimize.UglifyJsPlugin()
                    ),
                },

                'build-dev': {
                    debug: true,
                },
            },

            'webpack-dev-server': {
                options: {
                    webpack: webpackConfig,
                    publicPath: '/' + webpackConfig.output.publicPath,
                    port: WEBPACK_PORT,
                },

                start: {
                    contentBase: './demo',
                    keepAlive: true,
                    webpack: {
                        devtool: USE_SOURCE_MAPS ? 'inline-cheap-module-eval-source-map' : 'eval',
                        debug: true,
                    },
                },
            },

            watch: {
                app: {
                    files: ['src/**/*', 'demo/**/*'],
                    tasks: ['webpack:build-dev'],
                    options: {
                        spawn: false,
                    },
                },

                karma: {
                    files: ['src/**/*', 'spec/**/*'],
                    tasks: ['karma:unit:run'],
                },
            },
        });

        // =======================================================================
        // Building Tasks
        // =======================================================================

        // The development server (the recommended option for development)
        grunt.registerTask('default', ['webpack-dev-server:start']);

        // Build and watch cycle (another option for development)
        // Advantage: No server required, can run app from filesystem
        // Disadvantage: Requests are not blocked until bundle is available,
        //               can serve an old app on too fast refresh
        grunt.registerTask('dev', ['webpack:build-dev', 'watch:app']);

        // Production build
        grunt.registerTask('build', ['webpack:build']);

        // =======================================================================
        // Testing Tasks
        // =======================================================================

        // Lint file contents and file names
        grunt.registerTask('lint', ['filenames']); // TODO: move filename check out of grunt

        // Single run of unit tests (suitable for continuous integration system)
        grunt.registerTask('test', ['karma:ci']);

        // register the post-coverage task
        grunt.registerTask('post-coverage', 'Move coverage report to a more browser-friendly location', () => {
            this.moveCoverageUp(path.join(process.cwd(), 'coverage'), grunt.log.writeln);
        });

        // Single run of unit tests where code coverage is calculated
        grunt.registerTask('test-coverage', ['karma:coverage', 'post-coverage']);
    },
};

