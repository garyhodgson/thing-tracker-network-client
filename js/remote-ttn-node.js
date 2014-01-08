var Class = require('jsclass/src/core').Class,
    _ = require('lodash'),
    RemoteTracker = require('./remote-tracker'),
    EventEmitter = require('events').EventEmitter,
    fs = require("fs-extra"),
    restify = require('restify'),
    log = require('kadoh/lib/logging').ns('RemoteTTNNode');

var RemoteTTNNode = module.exports = new Class(EventEmitter, {

  events: {
    initialized: "initialized",
    trackerAdded: "trackerAdded"
  },

  initialize: function(nodeId, dhtNode, callback) {

    var that = this;
    this.dhtNode = dhtNode;
    this.trackers = {};
    this.nodeId = nodeId;
    this.verified = false;
    this.online = false;

    this.nodeLocation = GLOBAL.dataPath+"/cache/node/"+nodeId + "/node.json";

    if (!GLOBAL.skipCache && fs.existsSync(this.nodeLocation)){
      this._nodeJSON = fs.readJsonSync(this.nodeLocation);

      this._populateTrackers(false, callback);

    } else {

      dhtNode.getNodeAsync(nodeId, function(remoteNode){
        if (remoteNode === undefined){
          return callback("Unable to retrieve remote node info from DHT for nodeId: "+ nodeId);
        }
        that.online = true;
        that.remoteNodeInfo = remoteNode.ttnNodeInfo;

        var protocol = that.remoteNodeInfo.restProtocol||'http';
        var address = that.remoteNodeInfo.restAddress||remoteNode._address;
        var client = restify.createJsonClient({url: protocol+'://' + address});

        var cb = function(){
          that.persist();
          that._populateTrackers(true, callback);
          client.close();
        }

        client.get('/', function(err, req, res, remoteNodeJSON) {
          if (err) return callback(err);
          that._nodeJSON = remoteNodeJSON;
          cb();
        });

      });
    }
  },

  getJSON: function(){
    return this._nodeJSON;
  },

  getTrackers: function(){
    return this.trackers;
  },

  getTracker: function(id){
    return this.trackers[id];
  },

  addTracker: function(tracker){
    if (tracker === undefined) throw new Error("Attempt to add null tracker.");

    log.info("added new tracker with id: "+ tracker.id);
    this.trackers[tracker.id] = tracker;
    this.emit(this.events.trackerAdded, tracker);
  },

  persist: function(){
    fs.outputJson(this.nodeLocation, this._nodeJSON, function(err){
      if (err) return log.error("Error persisting remote node.", err);
    });
  },

  _populateTrackers: function(persist, callback){
    var that = this;
    _.each(this._nodeJSON.trackers, function(trackerJSON, index, list){
      var trackerId = trackerJSON.id;
      new RemoteTracker(that.nodeId, trackerId, that.remoteNodeInfo, function(err, tracker){
        if (err){
          if (callback !== undefined){
            callback(err);
          }
          return;
        }
        that.addTracker(tracker);
        if (persist){
          tracker.persist();
        }
      });
    });

    if (that.remoteNodeInfo === undefined){
      if (this.dhtNode.isJoined()){
        this._setTrackerRemoteNodeInfo();
      } else {
        this.dhtNode.on(this.dhtNode.events.joined, function(){
          that._setTrackerRemoteNodeInfo();
        });
      }
    }

    if (callback !== undefined){
      callback(null, that);
    }
    process.nextTick(function() { that.emit(that.events.initialized) });
  },

  _setTrackerRemoteNodeInfo: function(){
    var that = this;

    this.dhtNode.getNodeAsync(that.nodeId, function(remoteNode){
      if (remoteNode === undefined){
        return log.warn("Unable to find DHT Node " + that.nodeId);
      }
      that.online = true;
      that.remoteNodeInfo = remoteNode.ttnNodeInfo;
      _.each(that.trackers, function(tracker, index, list){
        tracker.setRemoteNodeInfo(that.remoteNodeInfo);
      });
    });

  }

});