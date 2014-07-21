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

  initialize: function(nodeId, localDhtNode, callback) {

    var that = this;
    this.localDhtNode = localDhtNode;
    this.trackers = {};
    this.nodeId = nodeId;
    this.nodeAddress = undefined;
    this.verified = false;
    this.online = undefined;

    this.nodeLocation = GLOBAL.dataPath + "/cache/node/" + nodeId + "/node.json";

    if (!GLOBAL.skipCache && fs.existsSync(this.nodeLocation)){
      this._nodeJSON = fs.readJsonSync(this.nodeLocation);

      this.nodeAddress = this._nodeJSON.nodeAddress
      this.lastSeenOnline = this._nodeJSON.lastSeen;

      this._populateTrackers(false, false, callback);

    } else {

      this.refresh(callback);
    }
  },

  _setRemoteNodeInfo: function(remoteNode){
    if (remoteNode === undefined){
      this.online = false;
    } else {
      this.online = true;
      this.lastSeenOnline = remoteNode._lastSeen;
      this.remoteNodeInfo = remoteNode.ttnNodeInfo;
      this.nodeAddress = remoteNode._address;

      if (this._nodeJSON !== undefined){
        this._nodeJSON.lastSeen = remoteNode._lastSeen;
        this._nodeJSON.nodeAddress = remoteNode._address;
        this.persist();
      }
    }
  },

  refresh: function(callback){
    var that = this;
    this.localDhtNode.getNodeAsync(this.nodeId, false, function(remoteNode){
        if (remoteNode === undefined){
          return callback("Unable to retrieve remote node info from DHT for nodeId: "+ nodeId);
        }

        that._setRemoteNodeInfo(remoteNode);

        var protocol = that.remoteNodeInfo.restProtocol||'http';
        var address = that.remoteNodeInfo.restAddress||remoteNode._address;
        var client = restify.createJsonClient({url: protocol+'://' + address});

        var cb = function(){
          that.persist();
          that._populateTrackers(true, true, callback);
          client.close();
        }

        client.get('/', function(err, req, res, remoteNodeJSON) {
          if (err) return callback(err);
          that._nodeJSON = remoteNodeJSON;
          cb();
        });

      });
  },

  getJSON: function(){
    return this._nodeJSON;
  },

  getID: function(){
    return this.nodeId;
  },

  getLastSeen: function(){
    if (!this.lastSeenOnline){
      return undefined;
    }
    return new Date(this.lastSeenOnline);
  },

  getAddress: function(){
    if (this._nodeJSON){
      return this._nodeJSON.nodeAddress;
    }
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

  ping: function(callback){

    if (this.localDhtNode === undefined){
      return callback("Unable to ping, no local DHT node.")
    }
    if (!this.localDhtNode.isOnline()){
      return callback("Unable to ping, local DHT node offline.")
    }

    var that = this;

    this.localDhtNode.pingNodeAsync(this.nodeId, this.nodeAddress, function(isAlive){

      if (isAlive === true){
        callback(null, isAlive);
      } else {
        var now = (new Date()).getTime();
        var timeSinceLastSeen = (new Date()).getTime() - that.lastSeenOnline
        if (timeSinceLastSeen < (30 /*mins*/ * 60 /*seconds*/ * 1000 /*ms*/)){
          return callback(null, isAlive);
        } else {
          log.info("Node hasn't been seen in a while so check if the address is up to date.")
          that.localDhtNode.getNodeAsync(that.nodeId, true, function(remoteNode){
            if (remoteNode === null){
              return callback(null, false);
            }
            that._setRemoteNodeInfo(remoteNode);
            that.ping(callback);
          });
        }
      }

    });

  },

  _populateTrackers: function(persist, refreshCache, callback){
    var that = this;
    _.each(this._nodeJSON.trackers, function(trackerJSON, index, list){
      var trackerId = trackerJSON.id;
      new RemoteTracker(that.nodeId, trackerId, that.remoteNodeInfo, refreshCache, function(err, tracker){
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
      if (this.localDhtNode.isJoined()){
        this._setTrackerRemoteNodeInfo();
      } else {
        this.localDhtNode.on(this.localDhtNode.events.joined, function(){
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

    this.localDhtNode.getNodeAsync(that.nodeId, false, function(remoteNode){
      if (remoteNode === undefined){
        return log.warn("Unable to find DHT Node " + that.nodeId);
      }
      that._setRemoteNodeInfo(remoteNode);
      _.each(that.trackers, function(tracker, index, list){
        tracker.setRemoteNodeInfo(that.remoteNodeInfo);
      });
    });

  }

});