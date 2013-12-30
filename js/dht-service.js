var Class = require('jsclass/src/core').Class,
    EventEmitter = require('events').EventEmitter,
    Crypto = require("crypto"),
    log = require('kadoh/lib/logging').ns('DHTService');


var DHTService = module.exports = new Class(EventEmitter, {

  events: {
    initialized: "initialized",
    connected: "connected",
    disconnected: "disconnected",
    joining: "joining",
    joined: "joined",
    remoteNodeRetrieved: "remoteNodeRetrieved"
  },


  initialize: function(node, server) {
    if (node === undefined) throw Error("No Node");
    var that = this;

    this._node = node
    this._remoteNodeCache = {};

    if (server != undefined){
      this._server = server;

      this._server.get('/node', function(req, res, next) {
        var info = {
          nodeId: that._node.getID(),
          publicKey: that._node.nodeKeys.getPublicKey(),
          signature: that._node.nodeKeys.getSignature(),
          address: that._node._address
        };
        res.send(info);
        return next();
      });

      this._server.get('/node/public-key', function(req, res, next) {
        res.setHeader('content-type', 'text/plain');
        res.send(that._node.nodeKeys.getPublicKey());
        return next();
      });

      this._server.get('/node/id', function(req, res, next) {
        res.setHeader('content-type', 'text/plain');
        res.send(that._node.getID());
        return next();
      });
    }

    process.nextTick(function() { that.emit(that.events.initialized) });
  },

  getDhtNode: function(){
    return this._node;
  },

  connect: function(){
    var that = this;
    this._node.connect(function() {
      that.emit(that.events.connected)
    });
  },

  disconnect: function(callback){
    var that = this;
    this._node.disconnect(function(){
      that.emit(that.events.disconnected);
      if (callback) callback();
    }, this);
  },

  join: function(){
    var that = this;
    that.emit(that.events.joining);
    this._node.join(function() {
      that.emit(that.events.joined);
    });
  },

  pingNodeAsync: function(nodeId, nodeAddress, callback){
    this._node.ping(nodeAddress, nodeId, callback, this);
  },

  getNodeAsync: function(nodeId, callback){
    if (callback === undefined){
      return;
    }
    var that = this;

    if (this._remoteNodeCache[nodeId] !== undefined){
      callback(this._remoteNodeCache[nodeId]);
    } else {
      this._node.findNode(nodeId, function(n){
        if (n) {

          that._node.getTTNNodeInfo(n._address, n._id, function(ttnNodeInfo){

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

});