var kadoh = require("kadoh"),
		GetTTNNodeInfoRPC = require('./rpc/getttnnodeinfo.js');

var DHTNode = module.exports = kadoh.logic.KademliaNode.extend({

	initialize: function(id, options) {
    	this.supr(id, options);

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

    if (this.nodeKeys){
      ttnNodeInfo.publicKey = this.nodeKeys.getPublicKey();
      var signature = this.nodeKeys.sign(JSON.stringify(ttnNodeInfo));
      ttnNodeInfo.nodeIdPublicKeySignature = signature;
    }

    rpc.resolve(ttnNodeInfo);
  },

});