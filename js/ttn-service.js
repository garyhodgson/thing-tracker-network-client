var Tracker = require('./tracker'),
    RemoteTracker = require('./remote-tracker'),
    TrackerService = require('./tracker-service'),
    DHTService = require('./dht-service'),
    RestServerFactory = require('./rest-server-factory'),
    TTNNode = require("./ttn-node"),
    NodeKeys = require("./node-keys"),
    _ = require('underscore'),
    Class = require('jsclass/src/core').Class,
    EventEmitter = require('events').EventEmitter,
    log = require('kadoh/lib/logging').ns('TTNService'),
    eventbus = require('./event-bus');

var TTNService = module.exports = new Class(EventEmitter, {

  events: {
    initialized: 'initialized',
    displayStats: 'displayStats',
    foundNode: 'foundNode'
  },

  initialize: function(config) {
    this.config = config;
    var that = this;

    //sigh
    GLOBAL.dataPath = config.dataPath;

    var nodeId = null;
    if (config.transient!="true"){
      var nodeKeys = this.nodeKeys = new NodeKeys(config.dataPath);
      nodeId = nodeKeys.getPublicKeyHash();
    }

    var dhtNode = this.dhtNode = new TTNNode(nodeId, {
        bootstraps : config.dht.bootstraps,
        persistence: 'memory',
        reactor : {
          protocol  : 'jsonrpc2',
          transport : {
            port: config.dht.port,
            reconnect: true
          }
        }
      })

    dhtNode.trackerInfo = {
      restProtocol : config.RESTServer.protocol||'http'
    }

    if (config.transient!="true"){
      dhtNode.nodeKeys = nodeKeys;
    }

    var restServer = this.restServer = (new RestServerFactory()).instance(nodeKeys, dhtNode.trackerInfo.restProtocol);


    var dhtService = this.dhtService = new DHTService(dhtNode, restServer);

    this.trackerService;

    new Tracker("/tracker/"+nodeId+"/tracker.json", {"dataPath":config.dataPath}, function(tracker){
      that.trackerService = new TrackerService(tracker, restServer);
    });

    /* Wire up events */

    restServer.on('initialized', function(name, url){
      log.debug(name + ' listening at ' + url);
    });

    dhtService.on(dhtService.events.joined, function(){
      eventbus.emit(eventbus.events.dhtService.joined);
      log.info('node joined the network, id = ' + dhtNode.getID() + ', address = ' + dhtNode.getAddress());
    })
    .on(dhtService.events.joining, function(){
      log.debug('node joining network...');
    })
    .on(dhtService.events.connected, function(){
      log.debug('node connected to network.');
      dhtService.join();
    })
    .on(dhtService.events.initialized, function(){
      log.debug('node service initialized.');

      if (config.startup.joinDHT == 'true'){
        dhtService.connect();
      }
      if (config.startup.startRESTServer == 'true'){
        restServer.listen(config.RESTServer.port, function() {
          restServer.emit('initialized', restServer.name, restServer.url);
          restServer.initialized = true;
        });
      }
    })
    .on(dhtService.events.disconnected, function(node){
      log.warn('node disconnected from network.');
    });

    process.nextTick(function() { that.emit(that.events.initialized) });
  },

  shutdown:  function(cb){
    this.dhtService.disconnect(cb);
  },

  stats: function(){
    this.emit(this.events.displayStats,{
      "dhtConnected": (this.dhtNode.state == "connected"),
      "restServerConnected": (this.restServer.initialized !== undefined && this.restServer.initialized),
      "ttnNodeId": this.dhtNode.getID(),
      "ttnNodeAddress":  this.dhtNode.getAddress(),
      "peerCount" : this.dhtNode._routingTable.howManyPeers(),
      "bucketCount" : this.dhtNode._routingTable.howManyKBuckets(),
      "bootstraps" : this.dhtNode._bootstraps,
      "peerList" : _.flatten(this.dhtNode._routingTable._kbuckets.map(function(b){return b.array.map(function(x){return x})}))
    })
  },

  findNodeAsync: function(nodeId, callback){
    this.dhtService.getNodeAsync(nodeId, callback);
  },

});
