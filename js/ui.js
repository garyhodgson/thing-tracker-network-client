var Class = require('jsclass/src/core').Class;
var EventEmitter = require('events').EventEmitter;

var UI = module.exports = new Class(EventEmitter, {

  events: {
    initialized: "initialized"
  },

  initialize: function() {
    var that = this;
    var type,
        a;
    if(global.$ !== undefined) {
      a = require('./ui/browser-ui')
      type = "browser";
    } else {
      a = require('./ui/console-ui');
      type = "console";
    }

    that.uiImpl = new a();

    process.nextTick(function() { that.emit(that.events.initialized, type) });
  },

  log: function(){
    this.uiImpl.log.apply(this, arguments);
  },

  success: function(){
    that.uiImpl.success.apply(this, arguments);
  },

  warn: function(){
    that.uiImpl.warn.apply(this, arguments);
  },

  error: function(){
    that.uiImpl.error.apply(this, arguments);
  },

  serverEvents: {
    initialized: function(name, url){
      this.log('%s listening at %s', name, url);
    }
  },

  nodeServiceEvents: {
    initialized: function(){
      this.log('node service initialized');
    }
  },
  trackerServiceEvents: {
    initialized: function(){
      this.log('tracker service initialized');
    }
  }



});
