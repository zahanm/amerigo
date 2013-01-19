
'use strict';

var fs = require('fs')
  , path = require('path')
  , async = require('async')
  , mkdirpSync = require('mkdirp').sync
  , spawn = require('child_process').spawn;

var USAGE = 'rsync wrapper to keep remote and local directories in sync.\n' +
  'Usage: amerigo <up|down> <branchname>';

var RSYNC = 'rsync';
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
  ssh.stderr.on('data', function onErr(data) {
    output += String(data);
  });
  ssh.on('exit', function onExit(code) {
    if (code !== 0) abortJourney("Try ssh'ing into " + config.host);
    var remotebranch = output.split('\n').filter(function(line) {
      return !!/^\*/.exec(line);
    });
    if (remotebranch.length !== 1)
      abortJourney('Check your git dir on ' + config.host + ':' + config.root);
    remotebranch = remotebranch[0].slice(2);
    var localbranch = ARGV._[1];
    if (localbranch != remotebranch)
      abortJourney('Branch mismatch => local:' + localbranch + ' != remote:' + remotebranch);
    cb(config);
  });
}

function voyage(config) {
  var downloading = ARGV._[0] == 'down';
  async.forEachLimit(config.expeditions, 2, function iter(expedition, next) {
    var args = [ '--rsh=ssh', '--compress', '--recursive' ];
    if (ARGV.verbose) args.push('--verbose');
    if (ARGV['dry-run']) args.push('--dry-run');
    var remotepath = path.join(config.root, expedition.remote);
    var localpath = expedition.local;
    if (!fs.existsSync(localpath)) {
      console.log('mkdir -p ' + localpath);
      mkdirpSync(localpath);
    }
    var from = null
      , to = null;
    if (downloading) {
      from = config.host + ':' + remotepath;
      to = localpath;
    } else {
      from = localpath;
      to = config.host + ':' + remotepath;
    }
    if (/\/$/.exec(from) == null) from += '/';
    if (/\/$/.exec(to)) to = to.slice(0, to.length - 1);
    args.push(from);
    args.push(to);
    console.log(RSYNC + ' ' + args.join(' '));
    var rsync = spawn(RSYNC, args);
    var buf = '';
    rsync.stdout.on('data', function onOut(data) {
      buf += String(data);
    });
    rsync.stderr.on('data', function onErr(data) {
      buf += String(data);
    })
    rsync.on('exit', function onExit(code) {
      if (code !== 0) next('rsync errored out');
      else {
        if (ARGV.verbose) console.log(buf);
        next(null);
      }
    });
  }, function onIterExhaustion(err) {
    if (err) abortJourney(err);
    console.log('Fin.');
  });
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
  console.error();
  console.error(USAGE);
  console.error();
  process.exit(1);
}

var ARGV = require('optimist')
  .usage(USAGE)
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
