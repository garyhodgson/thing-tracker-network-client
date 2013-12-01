var Tracker = require('./tracker'),
    RemoteTracker = require('./remote-tracker'),
    TrackerService = require('./tracker-service'),
    DHTService = require('./dht-service'),
    restServer = require('./rest-server'),
    TTNNode = require("./ttn-node"),
    NodeKeys = require("./node-keys"),
    _ = require('underscore'),
    restify = require('restify'),
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


    if (config.transient!="true"){
      dhtNode.nodeKeys = nodeKeys;
    }

    var dhtService = this.dhtService = new DHTService(dhtNode, restServer);

    this.tracker;
    this.trackers = {};
    this.trackerService;

    var rootTracker = this.roottracker = new Tracker("/tracker/tracker.json", {"dataPath":config.dataPath}, function(tracker){
      that.tracker = tracker;
      that.trackers[tracker.id] = tracker;
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
      "restServerConnected": (restServer.initialized !== undefined && restServer.initialized),
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

  addTracker: function(tracker){
    if (tracker === undefined){
      return
    }
    log.info("added new tracker with id: "+ tracker.id);
    this.trackers[tracker.id] = tracker;
  },

  getTracker: function(nodeId){
    if (nodeId === undefined){
      return undefined;
    }
    return this.trackers[nodeId];
  },

  getRemoteTrackerAsync: function(nodeId, callback){
    var that = this;

    new RemoteTracker(nodeId, this, function(tracker){
      that.addTracker(tracker);
      if (callback) {
        callback(tracker);
      }
    });
  },

  getRemoteThingAsync: function(trackerId, thingId, version, callback){
    var that = this;
    var tracker = this.getTracker(trackerId);
    if (tracker === undefined){
      log.error("No local tracker with id: " + trackerId);
    }
    tracker.getThing(thingId, version, function(thing){
      if (callback) {
        callback(thing);
      }
    });
  },

});
