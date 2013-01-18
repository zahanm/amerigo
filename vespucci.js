
var spawn = require('child_process').spawn;

"This directory ain't ready to go on a journey just yet."
"Missing 'journey.json'"

function abortJourney(err) {
  console.error("Aborted!");
  console.error(err);
  process.exit(1);
}

if (require.main === module) {
  prepareVessel();
} else {
  module.exports.run = prepareVessel;
}
