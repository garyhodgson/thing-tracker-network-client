var Class = require('jsclass/src/core').Class,
    _ = require('underscore'),
    fs = require("fs"),
    restify = require('restify'),
    log = require('kadoh/lib/logging').ns('RemoteTTNNode');

var RemoteTTNNode = module.exports = new Class({

  events: {
    initialized: "initialized"
  },

  initialize: function(nodeId, dhtNode, callback) {
    var that = this;

    dhtNode.getNodeAsync(nodeId, function(dhtNode){

      that.dhtNode = dhtNode;

      var protocol = dhtNode.ttnNodeInfo.restProtocol||'http';
      var address = dhtNode.ttnNodeInfo.restServer||dhtNode._address;
      var client = restify.createJsonClient({url: protocol+'://' + address});

      var cb = function(){
        if (callback){
          callback(that);
        }
        process.nextTick(function() { that.emit(that.events.initialized) });
        client.close();
      }

      client.get('/', function(err, req, res, remoteNodeJSON) {
        if (err) throw err;

        that.nodeJSON = remoteNodeJSON;
        cb();
      });

    });
  },


});