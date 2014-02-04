var RPC       = require('kadoh/lib/network/rpc/rpc'),
    globals   = require('kadoh/lib/globals'),
    _ = require("lodash"),
    PeerArray = require('kadoh/lib/util/peerarray');

var AnnounceRPC = module.exports = RPC.extend({

  initialize: function(toPeer, fromPeer, originatingPeer, messageId, message, queriedPeers) {
    if (arguments.length === 0) {
      this.supr();
    } else {
      this.supr(toPeer, 'ANNOUNCE', [toPeer, fromPeer, originatingPeer, messageId, message, queriedPeers]);
    }
  },

  getToPeer: function() {
    return new Peer(this.getParams(0)._address, this.getParams(0)._id);
  },

  getFromPeer: function() {
    return new Peer(this.getParams(1)._address, this.getParams(1)._id);
  },

  getOriginatingPeer: function() {
    return new Peer(this.getParams(2)._address, this.getParams(2)._id);
  },

  getMessageId: function() {
    return this.getParams(3);
  },

  getMessage: function() {
    return this.getParams(4);
  },

  getQueriedPeers: function(){
    return this.getParams(5);
  },

  normalizeParams: function() {
    return {
      toPeer: this.getToPeer(),
      fromPeer: this.getFromPeer(),
      originatingPeer: this.getOriginatingPeer(),
      messageId : this.getMessageId(),
      message : this.getMessage(),
      queriedPeers : this.getQueriedPeers()
    };
  },

  handleNormalizedParams: function(params) {
    if (typeof params.message !== 'string') {
      this.reject(new Error('non valid announce'));
    } else {
      this.params = [params.toPeer, params.fromPeer, params.originatingPeer, params.messageId, params.message, params.queriedPeers];
    }
    return this;
  },

  normalizeResult: function() {
    return {};
  },

  handleNormalizedResult: function(result) {
    this.resolve(result);
  }
});