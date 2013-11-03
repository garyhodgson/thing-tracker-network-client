var Class = require('jsclass/src/core').Class;
var logging = require('kadoh/lib/logging');
var ConsoleLogger = require('kadoh/lib/logger/reporter/console')

var ConsoleUI = module.exports = new Class({

  initialize: function(config) {
    new ConsoleLogger(logging, config.level||'info');
    ConsoleUI._log = logging.ns(config.namespace||'');
  }
})