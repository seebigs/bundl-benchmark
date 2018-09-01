/**
 * Run benchmark comparisons in Bundl
 */

var Benchmark = require('benchmark');
var nodeAsBrowser = require('node-as-browser');

function launchBenchmark (bundl, files, options, done) {
    options = options || {};
    options.beforeEach = options.beforeEach || function () {};

    if (options.maxTime) {
        Benchmark.options.maxTime = options.maxTime;
    }

    function onStart (benches, event) {
        bundl.log();
        bundl.log(benches.currentTarget.name);
    }

    function onCycle (event) {
        options.beforeEach();
        bundl.log.gray(String(event.target));
    }

    function onComplete () {
        if (this.length) {
            var results = this.sort(function (a, b) {
                if (a.hz > b.hz) { return -1; }
                if (a.hz < b.hz) { return 1; }
                return 0;
            });
            var useColor = false;
            var margin = results[0].hz / results[1].hz;
            var redWins = results[0].name.indexOf(options.redWhen) !== -1;

            if (redWins) {
                margins.push(-1 * margin);
            } else {
                margins.push(margin);
            }

            var marginReadable = '';
            if (margin < 2) {
                marginReadable = Math.round(margin*10) / 10;
            } else {
                marginReadable = Math.round(margin);
                useColor = true;
            }

            var fastestMsg = 'Fastest is: ' + results[0].name + (marginReadable ? ' by ' + marginReadable + 'x' : '');
            if (useColor) {
                if (redWins) {
                    bundl.log.red(fastestMsg);
                } else {
                    bundl.log.green(fastestMsg);
                }
            } else {
                bundl.log.gray(fastestMsg);
            }

        } else {
            bundl.log.red('No winner found');
        }

        if (--activeSuites <= 0) {
            var marginsLen = margins.length;
            var marginsSum = 0;
            while (marginsLen--) {
                marginsSum += margins[marginsLen];
            }
            bundl.log('\nAverage margin: ' + Math.round(marginsSum / margins.length) + 'x');
            done();
        }
    }

    function onError (event) {
        bundl.log.error('Benchmark: ' + event.target.name + '\n' + event.target.error);
    }

    // setup browser environment
    nodeAsBrowser.init(global);

    // prep suites
    var suites = [];
    var suite;

    // add benchmarks
    files.forEach(function (filepath) {
        suite = new Benchmark.Suite(filepath + '...', {
            onStart: onStart,
            onCycle: onCycle,
            onComplete: onComplete,
            onError: onError
        });

        module.benchmark = suite;

        require(filepath);

        if (suite.length) {
            suites.push(suite);
        }
    });

    // run suites
    var activeSuites = suites.length;
    var margins = [];
    if (activeSuites) {
        suites.forEach(function (s) {
            s.run();
        });

    } else {
        bundl.log.error('No benchmarks added');
    }
}


module.exports = function (options) {
    options = options || {};

    function benchmark (srcFiles, done) {
        var bundl = this;
        launchBenchmark(bundl, srcFiles, options, done);
    }

    return {
        name: 'benchmark',
        stage: 'src',
        exec: benchmark,
    };
};
