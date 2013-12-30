var Class = require('jsclass/src/core').Class,
    EventEmitter = require('events').EventEmitter,
    restify = require('restify'),
    Tracker = require('./tracker'),
    log = require('kadoh/lib/logging').ns('TrackerService'),
    _ = require("underscore"),
    RemoteTracker = require('./remote-tracker');

var TrackerService = module.exports = new Class(EventEmitter, {

  events: {
    initialized:    "initialized",
    trackerAdded:   "trackerAdded",
    trackerRemoved: "trackerRemoved"
  },

  initialize: function(nodeConfig, restServer, dhtService) {
    var that = this;

    this.trackers = {};
    this.dhtService = dhtService;

    if (nodeConfig !== undefined){
      _.each(nodeConfig.trackers, function(tracker, index, list){
        var trackerId = tracker.id;
        if (trackerId !== undefined){
          new Tracker(nodeConfig.dataPath+"/tracker/"+trackerId+"/tracker.json", function(tracker){
            that.trackers[trackerId] = tracker;
            that.emit(that.events.trackerAdded, tracker);
          });
        }
      });

      dhtService.on(dhtService.events.joined, function(){

        _.each(nodeConfig.remoteTrackers, function(tracker, index, list){
          var trackerId = tracker.id;
          var nodeId = tracker.ttnNodeId;
          if (trackerId === undefined){
            return log.warn("Unable to initialize remote tracker, no trackerId.", tracker);
          }
          if (nodeId === undefined){
            return log.warn("Unable to initialize remote tracker, no nodeId.", tracker);
          }
          that.dhtService.getNodeAsync(nodeId, function(dhtNode){
            if (dhtNode === undefined){
              return log.warn("Unable to find DHT Node " + nodeId);
            }
            new RemoteTracker(trackerId, dhtNode, function(tracker){
              that.trackers[trackerId] = tracker;
              that.emit(that.events.trackerAdded, tracker);
            });
          });
        });
      });

    }

    if (restServer !== undefined){
      this._restServer = restServer;

      this._restServer.get('/tracker/:trackerId', function(req, res, next) {
        if (that.trackers[req.params.trackerId] === undefined){
          res.send(404);
        } else {
          res.send(that.trackers[req.params.trackerId].getJSON());
        }
        return next();
      });

      this._restServer.get('/tracker/:trackerId/thing/:id', function(req, res, next) {
        if (that.trackers[req.params.trackerId] === undefined){
          res.send(404);
        } else {
          res.send(that.trackers[req.params.trackerId].getThingSync(req.params.id)||404);
        }
        return next();
      });

      this._restServer.get('/tracker/:trackerId/thing/:id/version/:version', function(req, res, next) {
        if (that.trackers[req.params.trackerId] === undefined){
          res.send(404);
        } else {
          res.send(that.trackers[req.params.trackerId].getThingSync(req.params.id,req.params.version)||404);
        }
        return next();
      });

      this._restServer.get('/tracker/:trackerId/subtracker/:id', function(req, res, next) {
        if (that.trackers[req.params.trackerId] === undefined){
          res.send(404);
        } else {
          res.send(that.trackers[req.params.trackerId].getSubTracker(req.params.id)||404);
        }

        return next();
      });

      this._restServer.get(/\/tracker\/?.*/, restify.serveStatic({
        directory: GLOBAL.dataPath
      }));

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

  getRemoteTrackerAsync: function(nodeId, trackerId, dhtService, callback){
    var that = this;

    dhtService.getNodeAsync(nodeId, function(dhtNode){
      new RemoteTracker(trackerId, dhtNode, function(tracker){
        that.addTracker(tracker);
        tracker.persist();
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

    //TODO - careful! Should we have a check to ensure that local trackers cannot be deleted?
    delete this.trackers[trackerId];

    this.emit(this.events.trackerRemoved, trackerId);

    callback();

  },
})