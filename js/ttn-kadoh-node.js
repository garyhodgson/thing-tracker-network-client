var kadoh = require("kadoh"),
    _ = require("lodash"),

    Crypto             = require('kadoh/lib/util/crypto'),
    Deferred           = require('kadoh/lib/util/deferred'),
    PeerArray          = require('kadoh/lib/util/peerarray'),
    XORSortedPeerArray = require('kadoh/lib/util/xorsorted-peerarray'),
    IterativeDeferred  = require('kadoh/lib/util/iterative-deferred'),

    GetTTNNodeInfoRPC = require('./rpc/getttnnodeinfo.js'),
    AnnounceRPC = require('./rpc/announce.js');

var TTNKadohNode = module.exports = kadoh.logic.KademliaNode.extend({

  initialize: function(id, options, ttnNodeInfo) {
    this.supr(id, options);

    this.log = require('kadoh/lib/logging').ns(options.name||'TTNKadohNode')

    this.ttnNodeInfo = ttnNodeInfo;

    this.messageList = {};

    this._reactor.register({
      GET_TTN_NODE_INFO : GetTTNNodeInfoRPC,
      ANNOUNCE : AnnounceRPC
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
      "restAddress":this.getAddress().replace('0.0.0.0','127.0.0.1'),
      "restProtocol": this.ttnNodeInfo.restProtocol
    };

    if (this.ttnNodeInfo && this.ttnNodeInfo.nodeKeys){
      ttnNodeInfo.publicKey = this.ttnNodeInfo.nodeKeys.getPublicKey();
      var signature = this.ttnNodeInfo.nodeKeys.sign(JSON.stringify(ttnNodeInfo));
      ttnNodeInfo.nodeIdPublicKeySignature = signature;
    }

    rpc.resolve(ttnNodeInfo);
  },

  announce: function(message, messageId, originatingPeer, alreadyQueriedPeers, callback, context){
    var that = this;
    var thisPeer = new Peer(this._address, this._id);
    originatingPeer = originatingPeer || thisPeer;
    alreadyQueriedPeers = alreadyQueriedPeers||[];
    alreadyQueriedPeers.push(thisPeer)

    messageId = messageId || Crypto.digest.SHA1(originatingPeer.toString() + message);

    if (this.messageList[messageId]){
      that.log.warn("message already sent: " + messageId);
      return;
    }

    this.messageList[messageId] = {
        "message":message,
        "originatingPeer": originatingPeer
    };

    var excludedPeerArray = new PeerArray();
    _.each(alreadyQueriedPeers, function(queriedPeer){
      excludedPeerArray.addPeer(new Peer(queriedPeer._address, queriedPeer._id));
    });

    var send   = this.send(),
        peers  = this._routingTable.getClosePeers(this.getID(), 8, excludedPeerArray);

    if (_.isEmpty(peers.toArray())){
      that.log.info("No peers to send message to: " + messageId);
      return;
    }

    var init   = new XORSortedPeerArray(peers, this.getID()),
        lookup = new IterativeDeferred(init);

    var queriedPeers = _.last(excludedPeerArray.toArray(), 8*2);

    _.each(peers.toArray(), function(p){
      queriedPeers.push(new Peer(p._address, p._id));
    })

    that.log.info("sending message: " + messageId + " to " + peers.toArray() + " queriedPeers " + queriedPeers);

    function map(peer) {
      var rpc = new AnnounceRPC(peer, thisPeer, originatingPeer, messageId, message,  queriedPeers);
      send(rpc);
      return rpc;
    }

    function end(){
      that.log.info("end");
    }

    return lookup.map(map).end(end);
  },

  handleANNOUNCE: function(rpc) {


    if (this.messageList[rpc.getMessageId()]){
      this.log.warn("message from "+rpc.getFromPeer()+" already received: " + rpc.getMessageId());
      rpc.reject("message already received: " + rpc.getMessageId());
      return;
    }

    this.log.info("Announcement from "+rpc.getOriginatingPeer() + " via " + rpc.getFromPeer() + " : "+rpc.getMessage());

    this.announce(rpc.getMessage(), rpc.getMessageId(), rpc.getOriginatingPeer(), rpc.getQueriedPeers())

    rpc.resolve();
  },
});
