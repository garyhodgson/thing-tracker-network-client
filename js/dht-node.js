var Class = require('jsclass/src/core').Class,
    kadoh = require("kadoh"),
    _ = require("lodash"),
    TTNKadohNode = require("./ttn-kadoh-node.js"),
    Crypto = require("crypto"),
    EventEmitter = require('events').EventEmitter,
    log = require('kadoh/lib/logging').ns('DHTNode');

var DHTNode = module.exports = new Class(EventEmitter, {

  events: {
    initialized: "initialized",
    connected: "connected",
    disconnected: "disconnected",
    joining: "joining",
    joined: "joined",
    remoteNodeRetrieved: "remoteNodeRetrieved"
  },

	initialize: function(id, options, ttnNodeInfo) {
    var that = this;
    this.connected = false;
    this.joined = false;
    this.ttnNodeInfo = ttnNodeInfo;

    this.ttnKadohNode = new TTNKadohNode(id, options, ttnNodeInfo);

    this._remoteNodeCache = {};

    process.nextTick(function() { that.emit(that.events.initialized) });
	},

  connect: function(){
    var that = this;
    this.ttnKadohNode.connect(function() {
      that.connected = true;
      that.emit(that.events.connected)
    });
  },

  disconnect: function(callback){
    var that = this;
    this.ttnKadohNode.disconnect(function(){
      that.joined = false;
      that.connected = false;
      that.emit(that.events.disconnected);
      if (callback) callback();
    }, this);
  },

  join: function(){
    var that = this;
    that.emit(that.events.joining);
    this.ttnKadohNode.join(function() {
      that.joined = true;
      that.emit(that.events.joined);
    });
  },

  isJoined: function(){
    return this.joined;
  },

  isOnline: function(){
    return this.joined;
  },

  isConnected: function(){
    return this.connected;
  },

  pingNodeAsync: function(nodeId, nodeAddress, callback){
    this.ttnKadohNode.ping(nodeAddress, nodeId, callback, this);
  },

  getNodeAsync: function(nodeId, skipCache, callback){
    if (callback === undefined){
      return;
    }
    var that = this;

    if (!skipCache && this._remoteNodeCache[nodeId] !== undefined){
      return callback(this._remoteNodeCache[nodeId]);
    } else {
      this.ttnKadohNode.findNode(nodeId, function(remoteNode){
        if (remoteNode) {
          console.log("remoteNode = ",remoteNode);

          that.ttnKadohNode.getTTNNodeInfo(remoteNode._address, remoteNode._id, function(ttnNodeInfo){

            console.log("dht-node, ttnNodeInfo, ", ttnNodeInfo);

            if (ttnNodeInfo == null){
              log.warn("Unable to find ttnNodeInfo for node " + nodeId);
            } else {

              var shasum = Crypto.createHash('sha1');
              shasum.update(ttnNodeInfo.publicKey);
              var remoteNodePublicKeyHash = shasum.digest('hex');

              if (remoteNodePublicKeyHash !== nodeId){
                log.error("public key hash of remote node does not match node id!")
              }

              remoteNode.ttnNodeInfo = ttnNodeInfo
            }

            that._remoteNodeCache[nodeId.toString()] = remoteNode;
            that.emit(that.events.remoteNodeRetrieved, remoteNode);

            return callback(remoteNode);
          });


        } else {
          return callback(null);
        }
      })
    }
  },

  getID: function(){
    return this.ttnKadohNode.getID();
  },

  getAddress: function(){
    return this.ttnKadohNode.getAddress();
  },

  peerCount: function(){
    return this.ttnKadohNode._routingTable.howManyPeers()
  },
  kBucketCount: function(){
    return this.ttnKadohNode._routingTable.howManyKBuckets()
  },
  bootstrapList: function(){
    return this.ttnKadohNode._bootstraps;
  },
  peerList: function(){
    return _.flatten(this.ttnKadohNode._routingTable._kbuckets.map(function(b){return b.array.map(function(x){return x})}));
  },
  isConnected: function(){
    return this.ttnKadohNode.state == "connected";
  }

});
