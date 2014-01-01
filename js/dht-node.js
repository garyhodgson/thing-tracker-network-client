var Class = require('jsclass/src/core').Class,
    Forwardable = require('jsclass/src/forwardable').Forwardable,
    kadoh = require("kadoh"),
    _ = require("underscore"),
    Crypto = require("crypto"),
		GetTTNNodeInfoRPC = require('./rpc/getttnnodeinfo.js'),
    EventEmitter = require('events').EventEmitter,
    log = require('kadoh/lib/logging').ns('DHTNode');

/**
  TTNKadohNode extends the kadoh node class, which uses the klass library.
  Further down is the DHTNode class definition which uses an instance of TTNKadohNode.
  Some methods are forwarded to TTNKadohNode via DHTNode.
*/

var TTNKadohNode = kadoh.logic.KademliaNode.extend({

  initialize: function(id, options, trackerInfo) {
    this.supr(id, options);
    this.trackerInfo = trackerInfo;
    this._reactor.register({
      GET_TTN_NODE_INFO : GetTTNNodeInfoRPC
    });
  },

  getTTNNodeInfo: function(address, id, callback, context){

    context = context || this;
    var peer = new Peer(address, id);
    var getTTNNodeInfoRPC = new GetTTNNodeInfoRPC(peer);

    getTTNNodeInfoRPC.then(function(ttnNode) {
      if (callback) callback.call(context, ttnNode);
    }, function(a) {
      if (callback) callback.call(context, null);
    });

    this._reactor.sendRPC(getTTNNodeInfoRPC)

    return this;
  },

  handleGET_TTN_NODE_INFO: function(rpc) {
    var ttnNodeInfo = {
      "nodeId":this.getID(),
      "restServer":this.getAddress().replace('0.0.0.0','127.0.0.1'),
      "restProtocol": this.trackerInfo.restProtocol
    };

    if (this.trackerInfo && this.trackerInfo.nodeKeys){
      ttnNodeInfo.publicKey = this.trackerInfo.nodeKeys.getPublicKey();
      var signature = this.trackerInfo.nodeKeys.sign(JSON.stringify(ttnNodeInfo));
      ttnNodeInfo.nodeIdPublicKeySignature = signature;
    }

    rpc.resolve(ttnNodeInfo);
  },
});

var DHTNode = module.exports = new Class(EventEmitter, {
  extend: Forwardable,

  events: {
    initialized: "initialized",
    connected: "connected",
    disconnected: "disconnected",
    joining: "joining",
    joined: "joined",
    remoteNodeRetrieved: "remoteNodeRetrieved"
  },

	initialize: function(id, options, trackerInfo) {
    var that = this;

    this.ttnKadohNode = new TTNKadohNode(id, options, trackerInfo);

    this._remoteNodeCache = {};

    process.nextTick(function() { that.emit(that.events.initialized) });
	},
/*
  getID: function(){
    return this.ttnKadohNode.getID();
  },

  getAddress: function(){
    return this.ttnKadohNode.getAddress();
  },*/

  connect: function(){
    var that = this;
    this.ttnKadohNode.connect(function() {
      that.emit(that.events.connected)
    });
  },

  disconnect: function(callback){
    var that = this;
    this.ttnKadohNode.disconnect(function(){
      that.emit(that.events.disconnected);
      if (callback) callback();
    }, this);
  },

  join: function(){
    var that = this;
    that.emit(that.events.joining);
    this.ttnKadohNode.join(function() {
      that.emit(that.events.joined);
    });
  },

  pingNodeAsync: function(nodeId, nodeAddress, callback){
    this.ttnKadohNode.ping(nodeAddress, nodeId, callback, this);
  },

  getNodeAsync: function(nodeId, callback){
    if (callback === undefined){
      return;
    }
    var that = this;

    if (this._remoteNodeCache[nodeId] !== undefined){
      callback(this._remoteNodeCache[nodeId]);
    } else {
      this.ttnKadohNode.findNode(nodeId, function(n){
        if (n) {

          that.ttnKadohNode.getTTNNodeInfo(n._address, n._id, function(ttnNodeInfo){

            if (ttnNodeInfo == null){
              log.warn("Unable to find ttnNodeInfo for node " + nodeId);
            } else {

              var shasum = Crypto.createHash('sha1');
              shasum.update(ttnNodeInfo.publicKey);
              var remoteNodePublicKeyHash = shasum.digest('hex');

              if (remoteNodePublicKeyHash !== nodeId){
                log.error("public key hash of remote node does not match node id!")
              }

              n.ttnNodeInfo = ttnNodeInfo
            }

            that._remoteNodeCache[nodeId.toString()] = n;
            that.emit(that.events.remoteNodeRetrieved, n);

            callback(n);
          });


        } else {
          callback(undefined);
        }
      })
    }
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

});

DHTNode.defineDelegators('ttnKadohNode', 'getID', 'getAddress');
