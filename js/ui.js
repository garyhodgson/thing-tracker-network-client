var Class = require('jsclass/src/core').Class;
var EventEmitter = require('events').EventEmitter;

var UI = module.exports = new Class(EventEmitter, {

  events: {
    initialized: "initialized"
  },

  initialize: function(config) {
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

    UI.impl = new a(config||{});

    process.nextTick(function() { that.emit(that.events.initialized, type) });
  },

  log: {

    info: function(){
      UI.impl.log.info.apply(this, arguments);
    },

    debug: function(){
      UI.impl.log.debug.apply(this, arguments);
    },

    success: function(){
      UI.impl.log.success.apply(this, arguments);
    },

    warn: function(){
      UI.impl.log.warn.apply(this, arguments);
    },

    error: function(){
      UI.impl.log.error.apply(this, arguments);
    }

  },

  serverEvents: {
    initialized: function(name, url){
      this.log.info(name + ' listening at ' + url);
    }
  },

  nodeServiceEvents: {
    initialized: function(node){
      this.log.info('node service initialized.');
    },
    connected: function(node){
      this.log.info('node connected to network.');
    },
    joined: function(nodeID, nodeAddress){
      this.log.info('node joined the network, id = ' + nodeID + ', address = ' + nodeAddress)
    }
  },

  trackerServiceEvents: {
    initialized: function(){
      this.log.info('tracker service initialized');
    }
  }

});
