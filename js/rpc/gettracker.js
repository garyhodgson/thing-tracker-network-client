var RPC       = require('kadoh/lib/network/rpc/rpc'),
    globals   = require('kadoh/lib/globals'),
    PeerArray = require('kadoh/lib/util/peerarray');

var GetTrackerRPC = module.exports = RPC.extend({

  initialize: function(queried_peer) {
    if (arguments.length === 0) {
      this.supr();
    } else {
      this.supr(queried_peer, 'GET_TRACKER');
    }
  },


  normalizeParams: function() {
    return {

    };
  },

  handleNormalizedParams: function(params) {
    return this;
  },

  normalizeResult: function() {
    if (this.getResult()){
      return this.getResult()[0];
    }
    return {};
  },

  handleNormalizedResult: function(result) {
    this.resolve(result);
  }
});