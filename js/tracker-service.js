var Class = require('jsclass/src/core').Class,
    EventEmitter = require('events').EventEmitter;

var TrackerService = module.exports = new Class(EventEmitter, {

  events: {
    initialized: "initialized"
  },

  initialize: function(tracker, server) {
    if (tracker === undefined) throw Error("No tracker");
    if (server === undefined) throw Error("No Server");
    var that = this;

    that._tracker = tracker
    that._server = server;

    that._server.get('/tracker', function(req, res, next) {
      res.send(that._tracker.getTracker());
      return next();
    });

    that._server.get('/tracker/thing/:id', function(req, res, next) {
      res.send(that._tracker.getThing(req.params.id)||404);
      return next();
    });

    that._server.get('/tracker/subtracker/:id', function(req, res, next) {
      res.send(that._tracker.getSubTracker(req.params.id)||404);
      return next();
    });

    process.nextTick(function() { that.emit(that.events.initialized) });
  }

})