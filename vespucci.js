
'use strict';

var spawn = require('child_process').spawn;

"This directory ain't ready to go on a journey just yet."
"Missing 'journey.json'"

function voyage() {
  var downloading = ARGV._[0] == 'down';
  rsync --verbose --rsh=ssh --compress --recursive --dry-run
}

function prepareVessel() {
  var checks = [
    ARGV._.length === 2,
    ARGV._[0] == 'up' || ARGV._[0] == 'down',
    ARGV._[1] != ''
  ];
  var goodArgs = checks.reduce(function(passing, val) {
    return passing && val;
  }, true);
  if (!goodArgs) abortJourney('Arguments incorrect');
  voyage();
}

function abortJourney(err) {
  console.error('Aborted!');
  console.error(err);
  process.exit(1);
}

var ARGV = require('optimist')
  .usage('rsync wrapper to keep remote and local directories in sync.\nUsage: amerigo <up|down> <branchname>')
  .options({
    'verbose': {
      alias: 'v',
      type: 'boolean',
      desc: 'Print lots of information about progress'
    },
    'dry-run': {
      alias: 'n',
      type: 'boolean',
      desc: "Don't actually transfer anything"
    }
  })
  .argv;

if (require.main === module) {
  prepareVessel();
} else {
  module.exports.run = prepareVessel;
}
