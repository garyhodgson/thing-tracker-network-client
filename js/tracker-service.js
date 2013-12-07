var Class = require('jsclass/src/core').Class,
    EventEmitter = require('events').EventEmitter,
    restify = require('restify'),
    Tracker = require('./tracker'),
    log = require('kadoh/lib/logging').ns('TrackerService'),
    RemoteTracker = require('./remote-tracker');

var TrackerService = module.exports = new Class(EventEmitter, {

  events: {
    initialized: "initialized",
    trackerAdded: "trackerAdded",
    trackerRemoved: "trackerRemoved"
  },

  initialize: function(tracker, server) {
    var that = this;

    this.trackers = {}

    if (tracker !== undefined){
      this.addTracker(tracker);
      this._rootTracker = tracker

      if (server !== undefined){
        this._server = server;

        this._server.get('/tracker', function(req, res, next) {
          res.send(that._rootTracker.getJSON());
          return next();
        });

        this._server.get('/tracker/:trackerId', function(req, res, next) {
          if (that.trackers[req.params.trackerId] === undefined){
            res.send(404);
          } else {
            res.send(that.trackers[req.params.trackerId].getJSON());
          }
          return next();
        });

        this._server.get('/thing/:id', function(req, res, next) {
          res.send(that._rootTracker.getThingSync(req.params.id)||404);
          return next();
        });

        this._server.get('/tracker/:trackerId/thing/:id', function(req, res, next) {
          if (that.trackers[req.params.trackerId] === undefined){
            res.send(404);
          } else {
            res.send(that.trackers[req.params.trackerId].getThingSync(req.params.id)||404);
          }
          return next();
        });

        this._server.get('/thing/:id/:version', function(req, res, next) {
          res.send(that._rootTracker.getThingSync(req.params.id,req.params.version)||404);
          return next();
        });

        this._server.get('/tracker/:trackerId/thing/:id/:version', function(req, res, next) {
          if (that.trackers[req.params.trackerId] === undefined){
            res.send(404);
          } else {
            res.send(that.trackers[req.params.trackerId].getThingSync(req.params.id,req.params.version)||404);
          }
          return next();
        });

        this._server.get('/tracker/subtracker/:id', function(req, res, next) {
          res.send(that._rootTracker.getSubTracker(req.params.id)||404);
          return next();
        });

        this._server.get(/\/tracker\/?.*/, restify.serveStatic({
          directory: GLOBAL.dataPath
        }));

      }
    }

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

  removeRemoteTrackerAsync: function(trackerId, callback){
    if (trackerId === this._rootTracker.id){
      callback("cannot remove root tracker.");
      return;
    }
    delete this.trackers[trackerId];

    this.emit(this.events.trackerRemoved, trackerId);

    callback();

  },
})