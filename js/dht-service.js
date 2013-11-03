var Class = require('jsclass/src/core').Class,
    EventEmitter = require('events').EventEmitter,
    log = require('kadoh/lib/logging').ns('DHTService');


var DHTService = module.exports = new Class(EventEmitter, {

  events: {
    initialized: "initialized",
    connected: "connected",
    disconnected: "disconnected",
    joining: "joining",
    joined: "joined"
  },


  initialize: function(node, server) {
    if (node === undefined) throw Error("No Node");
    var that = this;

    this._node = node

    if (server != undefined){
      this._server = server;

      this._server.get('/node', function(req, res, next) {
        var info = {
          "node-id": that._node.getID(),
          "public-key": that._node.ttn.nodeKeys.getPublicKey()
        };
        res.send(info);
        return next();
      });

      this._server.get('/node/public-key', function(req, res, next) {
        res.setHeader('content-type', 'text/plain');
        res.send(that._node.ttn.nodeKeys.getPublicKey());
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
      that.emit(that.events.disconnected)
      if (callback) callback();
    }, this);
  },

  join: function(){
    var that = this;
    that.emit(that.events.joining)
    this._node.join(function() {
      that.emit(that.events.joined)
    });
  }

});