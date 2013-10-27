var kadoh = require("kadoh"),
		GetTrackerRPC = require('./rpc/gettracker.js');

var TTNNode = module.exports = kadoh.logic.KademliaNode.extend({

	initialize: function(id, options) {
    	// extends KademliaNode
    	this.supr(id, options);

    	this._reactor.register({
	      GET_TRACKER : GetTrackerRPC
	    });

	},

	getTracker: function(address, id, callback, context){

		context = context || this;
        var peer = new Peer(address, id);
        var getTrackerRPC = new GetTrackerRPC(peer);

        getTrackerRPC.then(function(tracker) {
          if (callback) callback.call(context, tracker);
        }, function(a) {
          if (callback) callback.call(context, null);
        });

        this._reactor.sendRPC(getTrackerRPC)

        return this;
	},

	handleGET_TRACKER: function(rpc) {
        rpc.resolve(this._tracker);
      },

});