var Class = require('jsclass/src/core').Class,
    EventEmitter = require('events').EventEmitter;

var NodeService = module.exports = new Class(EventEmitter, {

  events: {
    initialized: "initialized",
    connected: "connected",
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
          "key": "xyz"
        };
        res.send(info);
        return next();
      });

      this._server.get('/node/key', function(req, res, next) {
        res.send("xyz");
        return next();
      });

      this._server.get('/node/id', function(req, res, next) {
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

  join: function(){
    var that = this;
    this._node.join(function() {
      that.emit(that.events.joined)
    });
  }

});