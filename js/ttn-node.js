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
    var tracker = {
      "nodeId":this.getID(),
      "restServer":this.getAddress(),
      "restProtocol": this.trackerInfo.restProtocol
    };

    if (this.nodeKeys){
      tracker.publicKey = this.nodeKeys.getPublicKey();
      var signature = this.nodeKeys.sign(JSON.stringify(tracker));
      tracker.signature = signature;
    }

    rpc.resolve(tracker);
  },

});