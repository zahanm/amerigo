// Using for cleaner asynchronous programming.
// Taken from [lie-to-me/lib/defers.js](https://github.com/babelon/lie-to-me/)

function Promise () {
  this.continuations = [];
  this.contexts = [];
  this.prefilled = [];
  this.stalled = function() {};
};

Promise.prototype.then = function(f, c) {
  if (typeof f !== 'function') { throw new TypeError("You must pass a function as the 'then' handler"); }
  this.continuations.push(f);
  this.contexts.push(c || this);
  var args = Array.prototype.slice.call(arguments, 2);
  this.prefilled.push(args);
  return this;
};

Promise.prototype.instead = function(f) {
  if (typeof f !== 'function') { throw new TypeError("You must pass a function as the 'error' handler"); }
  this.stalled = f;
  return this;
};

/**
  God, this is beautiful.
  If you add a promise followon using .then(),
  the next .then() will be invoked after
  it finishes
*/
Promise.prototype.resolve = function onResolve() {
  var next, context, args, ret;
  if (!this.continuations.length) { return; }
  next = this.continuations.shift();
  context = this.contexts.shift();
  args = this.prefilled.shift();
  Array.prototype.push.apply(args, arguments);
  ret = next.apply(context, args);
  if (ret instanceof Promise) {
    ret.then(this.resolve, this);
  }
};

Promise.prototype.abort = function onAbort(err) {
  this.stalled(err);
}

module.exports.Promise = Promise;
