var Class = require('jsclass/src/core').Class,
    EventEmitter = require('events').EventEmitter,
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
          "node-id": that._node.getID(),
          "public-key": that._node.nodeKeys.getPublicKey()
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
    that.emit(that.events.joining)
    this._node.join(function() {
      that.emit(that.events.joined)
    });
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
          that._remoteNodeCache[nodeId.toString()] = n;
          that.emit(that.events.remoteNodeRetrieved, n);
          callback(that._remoteNodeCache[nodeId]);
        } else {
          callback(undefined);
        }
      })
    }

  },

});