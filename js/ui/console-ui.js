var Class = require('jsclass/src/core').Class;
var logging = require('kadoh/lib/logging');
var ConsoleLogger = require('kadoh/lib/logger/reporter/color-console')

var ConsoleUI = module.exports = new Class({

  initialize: function(config) {

    new ConsoleLogger(logging, config.level||'info');
    ConsoleUI._log = logging.ns(config.namespace||'CLI');
  },

  log: {
    info: function(){
      ConsoleUI._log.info.apply(this, arguments);
    },

    debug: function(){
      ConsoleUI._log.debug.apply(this, arguments);
    },

    success: function(){
      ConsoleUI._log.info.apply(this, arguments);
    },

    warn: function(){
      ConsoleUI._log.warn.apply(this, arguments);
    },

    error: function(){
      ConsoleUI._log.error.apply(this, arguments);
    }
  }
})