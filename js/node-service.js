var Class = require('jsclass/src/core').Class,
    EventEmitter = require('events').EventEmitter;

var NodeService = module.exports = new Class(EventEmitter, {

  events: {
    initialized: "initialized"
  },


  initialize: function(node, server) {
    if (node === undefined) throw Error("No Node");
    if (server === undefined) throw Error("No Server");
    var that = this;

    that._node = node
    that._server = server;

    that._server.get('/node', function(req, res, next) {
      var info = {
        "node-id": that._node.getID(),
        "key": "xyz"
      };
      res.send(info);
      return next();
    });

    that._server.get('/node/key', function(req, res, next) {
      res.send("xyz");
      return next();
    });

    that._server.get('/node/id', function(req, res, next) {
      res.send(that._node.getID());
      return next();
    });

    process.nextTick(function() { that.emit(that.events.initialized) });
  }

});