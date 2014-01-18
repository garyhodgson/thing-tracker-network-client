var Class = require('jsclass/src/core').Class,
    EventEmitter = require('events').EventEmitter;

var EventBus = new Class(EventEmitter, {

  events: {
    app: {
      closeRequest: "app.closeRequest",
      generatingKeys: "app.generatingKeys"
    },
    initialized: "initialized",
    dhtNode: {
      joined: "dhtNode.joined"
    },
    tracker: {
      initialized: "tracker.initialized",
      online: "tracker.online",
      offline: "tracker.offline"
    }
  },

  initialize: function() {
    var that = this;
    process.nextTick(function() { that.emit(that.events.initialized) });
  }
});

module.exports = new EventBus();