var Class = require('jsclass/src/core').Class,
    EventEmitter = require('events').EventEmitter,
    restify = require('restify'),
    Tracker = require('./tracker'),
    log = require('kadoh/lib/logging').ns('TrackerService'),
    RemoteTracker = require('./remote-tracker');

var TrackerService = module.exports = new Class(EventEmitter, {

  events: {
    initialized: "initialized",
    trackerAdded: "trackerAdded"
  },

  initialize: function(tracker, server) {
    if (tracker === undefined) throw Error("No tracker");
    if (server === undefined) throw Error("No Server");
    var that = this;

    this.trackers = {}
    this.addTracker(tracker);
    this._rootTracker = tracker
    this._server = server;

    that._server.get('/tracker', function(req, res, next) {
      res.send(that._rootTracker.getJSON());
      return next();
    });

    that._server.get('/thing/:id', function(req, res, next) {
      res.send(that._rootTracker.getThingSync(req.params.id)||404);
      return next();
    });

    that._server.get('/thing/:id/:version', function(req, res, next) {
      res.send(that._rootTracker.getThingSync(req.params.id,req.params.version)||404);
      return next();
    });

    that._server.get(/\/thing\/?.*/, restify.serveStatic({
      directory: './data'
    }));

    that._server.get('/tracker/subtracker/:id', function(req, res, next) {
      res.send(that._rootTracker.getSubTracker(req.params.id)||404);
      return next();
    });

    process.nextTick(function() { that.emit(that.events.initialized) });
  },

  addTracker: function(tracker){
    if (tracker === undefined) throw Error("Attempt to add null tracker.");

    log.info("added new tracker with id: "+ tracker.id);
    this.trackers[tracker.id] = tracker;
    this.emit(this.events.trackerAdded, tracker);
  },

  getTracker: function(id){
    return this.trackers[id];
  },

  getRootTracker: function(){
    return this._rootTracker;
  },

  getRemoteTrackerAsync: function(nodeId, dhtService, callback){
    var that = this;

    dhtService.getNodeAsync(nodeId, function(dhtNode){
      new RemoteTracker(nodeId, dhtNode, function(tracker){
        that.addTracker(tracker);
        if (callback) {
          callback(tracker);
        }
      });
    });
  },

  getRemoteThingAsync: function(trackerId, thingId, version, callback){
    var that = this;
    var tracker = this.getTracker(trackerId);
    if (tracker === undefined){
      log.error("No local tracker with id: " + trackerId);
    }
    tracker.getThing(thingId, version, function(thing){
      if (callback) {
        callback(thing);
      }
    });
  },
})