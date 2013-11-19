var Class = require('jsclass/src/core').Class,
    colors = require('colors');

colors.mode = "browser";

var LOG_LEVEL = {
  debug : 0,
  info  : 1,
  warn  : 2,
  error : 3,
  fatal : 4
};

var make_title = function(ns, event) {
  var emit = (typeof event !== 'undefined') ? ' emits '+event : '';
  var date = (new Date()).toISOString();
  return '['+date+'] ['+ns+emit+']';
};

var AngularConsole = module.exports = new Class({

  initialize: function(logemiter, level, $scope, $timeout) {

    this.setLevel(level || 'error');
    this.$scope = $scope;
    this.$timeout = $timeout

    logemiter.onAny(function(level, log) {
      if(LOG_LEVEL[level] >= this.level && typeof this[level] !== 'undefined') {
        var that = this;
          $timeout(function(){
            that[level](log);
          });
      }
    }, this);
  },

  _logMessage : function(msg){
    this.$scope.messages.push(msg);
  },

  _notify : function(level, msg){
    if (this.$scope.notifier){
      this.$scope.notifier[level](msg);
    }
  },

  setLevel : function(level) {
    this.level = (typeof level === 'number') ? level : LOG_LEVEL[level];
  },

  debug : function(log) {
    var title = make_title(log.ns.toString(), log.event);
    log.args.unshift(title);
    console.log.apply(console, log.args);
    this._logMessage("[DEBUG] ".grey + log.args.join(" "))
  },

  info : function(log) {
    var title = make_title(log.ns.toString(), log.event);
    log.args.unshift(title);
    console.log.apply(console, log.args);
    var msg = "[INFO] ".bold.green + log.args.join(" ");
    this._logMessage(msg);
    this._notify('log', msg);
  },

  warn : function(log) {
    var title = make_title(log.ns, log.event);
    log.args.unshift(title);
    console.warn.apply(console, log.args);
    this._logMessage("[WARN] ".bold.yellow + log.args.join(" "))
    this._notify('error', "[WARN] ".bold + log.args.join(" "));
  },

  error : function(log) {
    var title = make_title(log.ns.toString(), log.event);
    log.args.unshift(title);
    console.error.apply(console, log.args);
    var msg = "[ERROR] ".bold.red + log.args.join(" ");
    this._logMessage(msg);
    this._notify('error', msg);
  },

  fatal : function(log) {
    var title = make_title(log.ns.toString(), log.event);
    log.args.unshift(title);
    console.error.apply(console, log.args);
    var msg = "[FATAL] ".bold.underline.red + log.args.join(" ");
    this._logMessage(msg);
    this._notify('error', msg);
  }
});