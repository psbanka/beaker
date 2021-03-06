/**
 * @author Adam Meadows [@job13er](https://github.com/job13er)
 * @copyright 2015 Ciena Corporation. All rights reserved
*/

'use strict';

require('../typedefs');

const _ = require('lodash');
const utils = require('./utils');

/** obvious */
function showVersion() {
    var pkgJSON = require('../../package.json');
    console.log(pkgJSON.name + ' v' + pkgJSON.version);
}

/**
 * Execute the appropriate command based on command-line arguments
 * @param {MinimistArgv} argv - the minimist argv command-line arguments
 * @throws {CliError}
 */
module.exports = function (argv) {
    // when no command given, default to 'help' (or version)
    if (argv._.length === 0) {

        if (argv.v || argv.version) {
            showVersion();
            return;
        }

        argv._.push('help');
    }

    const command = argv._[0];

    if (!_.has(this, command)) {
        utils.throwCliError('Invalid command "' + command + '"', 1);
        return; // not really necessary except for when testing and spying on utils.throwCliError
    }

    this[command](argv);
};
