
'use strict';

var fs = require('fs');
var spawn = require('child_process').spawn;

"This directory ain't ready to go on a journey just yet."
"Missing 'journey.json'"

var COMMAND = 'rsync';
var CONFIG_FILE = 'journey.json';
var SSH = 'ssh';
var GITB = 'git branch'

function branchCheck(config, cb) {
  var check = "cd " + config.root + " && " + GITB;
  var args = [ config.host, check ];
  var ssh = spawn(SSH, args);
  var output = '';
  ssh.stdout.on('data', function onOut(data) {
    output += String(data);
  });
  ssh.stderr.on('data', function onOut(data) {
    output += String(data);
  });
  ssh.on('exit', function(code) {
    if (code !== 0) abortJourney("Try ssh'ing into " + config.host);
    var remotebranch = output.split('\n').filter(function(line) {
      return !!/^\*/.exec(line);
    });
    if (remotebranch.length !== 1)
      abortJourney('Check your git dir on ' + config.host + ':' + config.root);
    remotebranch = remotebranch[0].slice(2);
    var localbranch = ARGV._[1];
    if (localbranch != remotebranch)
      abortJourney('Branch mismatch => remote:' + remotebranch + ' != local:' + localbranch);
    cb(config);
  });
}

function voyage(config) {
  var downloading = ARGV._[0] == 'down';
  "rsync --verbose --rsh=ssh --compress --recursive --dry-run"
  var args = [ '--rsh=ssh', '--compress', '--recursive' ];
  if (ARGV.verbose) args.push('--verbose');
  if (ARGV['dry-run']) args.push('--dry-run');
  console.log("success");
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
  if (!fs.existsSync(CONFIG_FILE) || !fs.statSync(CONFIG_FILE).isFile())
    abortJourney(CONFIG_FILE + ' missing');
  fs.readFile(CONFIG_FILE, function onRead(err, contents) {
    if (err) abortJourney("File reading error: " + CONFIG_FILE);
    var config = {};
    try {
      config = JSON.parse(contents);
    } catch (err) {
      abortJourney("JSON parsing error: " + CONFIG_FILE);
    }
    branchCheck(config, voyage);
  });
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
