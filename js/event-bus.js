var Class = require('jsclass/src/core').Class,
    EventEmitter = require('events').EventEmitter;

var EventBus = new Class(EventEmitter, {

  events: {
    initialized: "initialized",
    dhtService: {
      joined: "dhtService.joined"
    },
    tracker: {
      loaded: "tracker.loaded"
    }
  },

  initialize: function() {
    var that = this;
    process.nextTick(function() { that.emit(that.events.initialized) });
  }
});

module.exports = new EventBus();