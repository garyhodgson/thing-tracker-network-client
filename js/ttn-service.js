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

    var node = this.node = new TTNNode(nodeId, {
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

    node.ttn = node.ttn||{ remoteNodeCache:{} };

    if (config.transient!="true"){
      node.ttn.nodeKeys = nodeKeys;
    }

    var dhtService = this.dhtService = new DHTService(node, restServer);

    this.tracker;
    this.trackers = {};
    this.trackerService;

    var rootTracker = this.roottracker = new Tracker("/tracker/tracker.json", {"dataPath":config.dataPath}, function(tracker){
      that.tracker = tracker;
      that.trackers[tracker.ttnNodeId] = tracker;
      that.trackerService = new TrackerService(tracker, restServer);
    });




    /* Wire up events */

    restServer.on('initialized', function(name, url){
      log.debug(name + ' listening at ' + url);
    });

    dhtService.on(dhtService.events.joined, function(){

      eventbus.emit(eventbus.events.dhtService.joined);
      log.info('node joined the network, id = ' + node.getID() + ', address = ' + node.getAddress());
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
      "dhtConnected": (this.node.state == "connected"),
      "restServerConnected": (restServer.initialized !== undefined && restServer.initialized),
      "ttnNodeId": this.node.getID(),
      "ttnNodeAddress":  this.node.getAddress(),
      "peerCount" : this.node._routingTable.howManyPeers(),
      "bucketCount" : this.node._routingTable.howManyKBuckets(),
      "bootstraps" : this.node._bootstraps,
      "peerList" : _.flatten(this.node._routingTable._kbuckets.map(function(b){return b.array.map(function(x){return x})}))
    })
  },

  findNode: function(nodeId){
    var that = this;
    this.node.findNode(nodeId, function(v){

      if (that.node.ttn.remoteNodeCache[nodeId] !== undefined){
        log.debug("cache hit for ", nodeId);
        that.emit(that.events.foundNode, nodeId,that.node.ttn.remoteNodeCache[nodeId]);
      } else {
        if (v) {
          that.node.ttn.remoteNodeCache[nodeId.toString()] = v;
          that.emit(that.events.foundNode, nodeId, v);
        } else {
          that.emit(that.events.foundNode, nodeId, null);
        }
      }
    })
  },

  addTracker: function(tracker){
    if (tracker === undefined){
      return
    }
    console.log(tracker.id);
    this.trackers[tracker.id] = tracker;
  },

  getTracker: function(nodeId){
    if (nodeId === undefined){
      return
    }
    return this.trackers[nodeId];
  },

  getRemoteThing: function(trackerId, thingId, version, callback){
    var that = this;
    var _getThing = function(node){

      var target = (version)? '/thing/'+thingId+'/'+version : '/thing/'+thingId;
      restify.createJsonClient({url: 'http://' + node._address}).get(target, function(err, req, res, obj) {
        if (err) throw err;
        if (callback){
          callback(obj);
        }
      });
    }

    if (this.node.ttn.remoteNodeCache[trackerId] !== undefined){
      log.debug("found cached node");
      var cachedNode = this.node.ttn.remoteNodeCache[trackerId];

      _getThing(cachedNode);

    } else {

      this.node.findNode(trackerId, function(v){
        if (v) {
          that.node.ttn.remoteNodeCache[trackerId.toString()] = v;
          _getThing(that.node.ttn.remoteNodeCache[trackerId.toString()], callback)
        } else {
          log.info("Node not found");
        }
      })
    }
  },

  getRemoteTracker: function(nodeId, callback){
    var that = this;
    var _success = function(tracker){
      if (callback){
        callback(tracker);
      }
    }
    var _getTracker = function(node){

      restify.createJsonClient({url: 'http://' + node._address}).get('/tracker', function(err, req, res, obj) {
        if (err) throw err;
        node.tracker = obj;
        _success(obj);
      });
    }

    if (this.node.ttn.remoteNodeCache[nodeId] !== undefined){
      log.debug("found cached node");
      var cachedNode = this.node.ttn.remoteNodeCache[nodeId];

      if (cachedNode.tracker !== undefined){
        log.debug("found cached tracker");
        _success(cachedNode.tracker);
      } else {
        _getTracker(cachedNode);
      }

    } else {

      this.node.findNode(nodeId, function(v){
        if (v) {
          that.node.ttn.remoteNodeCache[nodeId.toString()] = v;
          _getTracker(that.node.ttn.remoteNodeCache[nodeId.toString()], callback)
        } else {
          log.info("Node not found");
        }
      })
    }
  }

});
