
'use strict';

var fs = require('fs')
  , path = require('path')
  , async = require('async')
  , mkdirpSync = require('mkdirp').sync
  , spawn = require('child_process').spawn
  , chokidar = require('chokidar')
  , rmSync = require('remove').removeSync
  , Promise = require('./defers').Promise;

var USAGE = 'rsync wrapper to keep remote and local directories in sync.\n' +
  'Usage: amerigo <up|down> <branchname>' +
  'Usage: amerigo init <new folder name>';

var RSYNC = 'rsync';
var CONFIG_FILE = 'journey.json';
var SYNC_DIR = '.';
var SSH = 'ssh';
var BRANCHCHECK = '[[ -d ./.git ]] && git branch; [[ -d ./.hg ]] && hg bookmark';

function branchCheck(localbranch, config) {
  var promise = new Promise();
  var check = "cd " + config.root + " && " + BRANCHCHECK;
  var args = [ config.endpoint, check ];
  if (ARGV.verbose) console.log(SSH + ' ' + args.join(' '));
  var ssh = spawn(SSH, args);
  var output = '';
  ssh.stdout.on('data', function onOut(data) {
    output += String(data);
  });
  ssh.stderr.on('data', function onErr(data) {
    output += String(data);
  });
  ssh.on('exit', function onExit(code) {
    if (code !== 0)
      return promise.abort("Try ssh'ing into " + config.endpoint);
    var remotebranch = null;
    var lines = output.split('\n');
    for (var ii = 0; ii < lines.length; ii++) {
      var matches = /^\s*\*\s*([\w-]+)/.exec(lines[ii]);
      if (matches !== null) {
        remotebranch = matches[1];
        break;
      }
    }
    if (remotebranch === null)
      return promise.abort('Check your git dir on ' + config.endpoint + ':' + config.root);
    var localbranch = ARGV._[1];
    if (localbranch != remotebranch)
      return promise.abort('Branch mismatch => local:' + localbranch + ' != remote:' + remotebranch);
    return promise.resolve(config);
  });
  return promise;
}

function voyage(action, config) {
  var promise = new Promise();
  async.forEachLimit(config.expeditions, 5, function iter(expedition, next) {
    var args = [ '--rsh=ssh', '--compress', '--recursive', '--delete', '--exclude=".DS_Store"' ];
    if (ARGV.verbose) args.push('--verbose');
    if (ARGV['dry-run']) args.push('--dry-run');
    var remotepath = path.join(config.root, expedition.remote);
    var localpath = expedition.local;
    if (action === 'down') {
      var folderpath = localpath;
      if (isPathToFile(folderpath)) {
        // take out file from path
        folderpath = path.join.apply(
          path,
          localpath.split(path.sep).slice(0, -1)
        );
      }
      if (!fs.existsSync(folderpath)) {
        console.log('mkdir -p ' + folderpath);
        mkdirpSync(folderpath);
      }
    }
    var from = null
      , to = null;
    if (action === 'down') {
      from = config.endpoint + ':' + remotepath;
      to = localpath;
    } else {
      from = localpath;
      to = config.endpoint + ':' + remotepath;
    }
    if (!isPathToFile(remotepath) && /\/$/.exec(from) == null)
      from += '/';
    if (/\/$/.exec(to)) to = to.slice(0, to.length - 1);
    args.push(from);
    args.push(to);
    if (ARGV.verbose) console.log(RSYNC + ' ' + args.join(' '));
    var rsync = spawn(RSYNC, args);
    var buf = '';
    rsync.stdout.on('data', function onOut(data) {
      buf += String(data);
    });
    rsync.stderr.on('data', function onErr(data) {
      buf += String(data);
    })
    rsync.on('exit', function onExit(code) {
      if (code !== 0) next('rsync errored out: ' + buf);
      else {
        if (ARGV.verbose) console.log(buf);
        next(null);
      }
    });
  }, function onIterExhaustion(err) {
    if (err) return promise.abort(err);
    console.log(action, 'fin');
    return promise.resolve();
  });
  return promise;
}

function oneWayTrip(direction, localbranch, config) {
  var checker = branchCheck(localbranch, config);
  checker.then(voyage, this, direction);
  checker.instead(abortJourney);
}

function returnJourneys(localbranch, config) {
  console.log('Use ^C to quit');
  // Initial download
  var checker = branchCheck(localbranch, config);
  checker.then(voyage, this, 'down');
  checker.instead(abortJourney);
  checker.then(function setupWatchers() {
    var watcher = chokidar.watch(SYNC_DIR, { ignored: /^(~|#)/, persistent: true });
    watcher
      .on('change', function onChange(path) {
        console.log('change:', path);
        if (/journey\.json$/.exec(path))
          return watcher.close();
        // upload the changes
        var checker = branchCheck(localbranch, config);
        checker.then(voyage, this, 'up');
        checker.instead(abortJourney);
      })
      .on('error', function onError(err) {
        console.error('Error:', err);
        watcher.close();
      });
    console.log('Watching for changes..');
  });
}

function resetSyncDir(config) {
  var shouldIgnore = [
    new RegExp('^' + CONFIG_FILE + '$'),
    /^\.git/,
    /^\.svn/
  ];
  if (config.ignores) {
    config.ignores.forEach(function(pat) {
      shouldIgnore.push(new RegExp('^' + pat + '$'));
    });
  }
  var files = fs.readdirSync(SYNC_DIR);
  console.log('Resetting directory:', SYNC_DIR);
  files
    .filter(function iter(f) {
      return !shouldIgnore.reduce(function(matched, pat) {
        return matched || pat.exec(f);
      }, false);
    })
    .forEach(function iter(f) { rmSync(f); });
}

function isPathToFile(p) {
  return path.extname(p).length > 0;
}

function initEmptyLaunchpad(padpath) {
  if (isPathToFile(padpath)) {
    abortJourney(
      "'" +
      padpath +
      "' seems point to a file, cannot create empty launchpad folder"
    );
  }
  if (fs.existsSync(padpath)) {
    abortJourney(
      "'" + padpath + "' already exists, cannot create empty launchpad"
    );
  }
  console.log('mkdir -p ' + padpath);
  mkdirpSync(padpath);
  var emptyLaunchpad = path.join(path.dirname(__filename), 'launchpad.json');
  fs.readFile(emptyLaunchpad, function(err, contents) {
    if (err) abortJourney('Reading from ' + emptyLaunchpad + ' failed');
    fs.writeFile(path.join(padpath, CONFIG_FILE), contents, function(err) {
      if (err) {
        abortJourney(
          'Writing to ' + path.join(padpath, CONFIG_FILE) + ' failed'
        );
      }
      console.log('Created empty launchpad at ' + padpath);
    });
  });
}

function checkVessel() {
  var checks = [
    ARGV._.length === 2,
    ARGV._[0] == 'up' || ARGV._[0] == 'down' || ARGV._[0] == 'sync' ||
      ARGV._[0] == 'init',
    ARGV._[1] != ''
  ];
  var goodArgs = checks.reduce(function(passing, val) {
    return passing && val;
  }, true);
  if (!goodArgs) abortJourney('Arguments incorrect');
  if (ARGV._[0] == 'init') return initEmptyLaunchpad(ARGV._[1]);
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
    if (ARGV.reset) {
      resetSyncDir(config);
    }
    if (config.user)
      config.endpoint = config.user + "@" + config.host;
    else
      config.endpoint = config.host;
    if (ARGV._[0] == 'sync')
      returnJourneys(ARGV._[1], config);
    else
      oneWayTrip(ARGV._[0], ARGV._[1], config);
  });
}

function abortJourney(err) {
  console.error('Aborted!');
  console.error(err);
  console.error();
  require('optimist').showHelp();
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
    },
    'reset': {
      alias: 'r',
      type: 'boolean',
      desc: 'resets the directory before downloading afresh'
    }
  })
  .argv;

if (require.main === module) {
  checkVessel();
} else {
  module.exports.run = checkVessel;
}
