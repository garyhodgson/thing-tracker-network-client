var Tracker = require('./tracker'),
    RemoteTTNNode = require('./remote-ttn-node'),
    RemoteTracker = require('./remote-tracker'),
    RemoteTrackerPlaceholderTTNNode = require('./remote-tracker-placeholder-ttn-node'),
    RestServerFactory = require('./rest-server-factory'),
    restify = require('restify'),
    DHTNode = require("./dht-node"),
    NodeKeys = require("./node-keys"),
    _ = require('lodash'),
    fs = require('fs-extra'),
    Class = require('jsclass/src/core').Class,
    EventEmitter = require('events').EventEmitter,
    log = require('kadoh/lib/logging').ns('TTNNode'),
    Crypto = require("crypto"),
    eventbus = require('./event-bus'),
    extIP = require("./util/extIP");

var TTNNode = module.exports = new Class(EventEmitter, {

  events: {
    initialized: 'initialized',
    displayStats: 'displayStats',
    foundNode: 'foundNode',
    trackerAdded:   "trackerAdded",
    trackerRemoved: "trackerRemoved",
    remoteNodeAdded: "remoteNodeAdded"
  },

  initialize: function(config) {
    var that = this;
    this.config = config;
    this.trackerNodeIndex = {};
    this.trackers = {};
    this.remoteNodes = {};

    GLOBAL.dataPath = config.dataPath; // sigh
    GLOBAL.skipCache = true;
    if (GLOBAL.skipCache){
      log.warn("GLOBAL.skipCache = true")
    }

    this.nodeKeys = new NodeKeys(config.dataPath);
    this.nodeId = this.nodeKeys.getPublicKeyHash();
    this.ttnNodeInfo = {
      restProtocol : config.RESTServer.protocol||'http',
      nodeKeys : this.nodeKeys
    };

    extIP.getIP(function(err, ip){
      if (err){
        return log.warn("Unable to determine external IP address. ", err);
      }
      that.ttnNodeInfo.externalIPAddress = ip;
    });

    this.initializeDHTNode();
    this.initializeNodeConfig();
    this.initializeTrackers();
    this.initializeRemoteNodes();
    this.initializeRESTServer();

    this.configureEventListeners(); // also joins network

    process.nextTick(function() { that.emit(that.events.initialized) });
  },

  initializeDHTNode: function(){
    var dhtNodeConfig = {
      bootstraps : this.config.dht.bootstraps,
      persistence: 'memory',
      reactor : {
        protocol  : 'jsonrpc2',
        transport : {
          port: this.config.dht.port,
          reconnect: true
        }
      }
    };
    this.dhtNode = new DHTNode(this.nodeId, dhtNodeConfig, this.ttnNodeInfo);
  },

  initializeNodeConfig: function(){
    var nodeConfigPath = this.nodeConfigPath = this.config.dataPath + "/node.json";
    if (!fs.existsSync(nodeConfigPath)){
      fs.writeFileSync(nodeConfigPath, JSON.stringify({
        "nodeId": this.nodeId,
        "trackers": []
      }));
    }
    this.nodeConfig =  fs.readJsonSync(nodeConfigPath);
  },

  initializeTrackers: function(){
    var that = this;
    _.each(this.nodeConfig.trackers, function(trackerEntry, index, list){
      var trackerId = trackerEntry.id;
      if (trackerId !== undefined){
        new Tracker(GLOBAL.dataPath+"/tracker/"+trackerId+"/tracker.json", function(tracker){
          that.trackers[trackerId] = tracker;
          that.trackerNodeIndex[trackerId] = that.nodeId;
          process.nextTick(function() { that.emit(that.events.trackerAdded, tracker); });
        });
      }
    });
  },

  initializeRemoteNodes: function(){
    var that = this;
    _.each(this.nodeConfig.remoteNodes, function(remoteNodeEntry, index, list){
      var remoteNodeId = remoteNodeEntry.id;
      if (remoteNodeId === undefined){
        return log.warn("No remote node id found in node config.");
      }
      that.initializeRemoteNode(remoteNodeId);
    });
  },

  initializeRemoteNode: function(remoteNodeId, callback){
    var that = this;
    new RemoteTTNNode(remoteNodeId, that.dhtNode, function(err, remoteTTNNode){
      if (err) { return log.error(err); }

      that.remoteNodes[remoteNodeId] = remoteTTNNode;
      process.nextTick(function() { that.emit(that.events.remoteNodeAdded, remoteTTNNode); });

      _.each(remoteTTNNode.getTrackers(), function(remoteTracker, index, list){
        that.trackerNodeIndex[remoteTracker.id] = remoteNodeId;
      });

      if (callback){ callback(null, remoteTTNNode); }
    });
  },

  getRemoteNode: function(remoteNodeId, callback){
    var that = this;
    if (that.remoteNodes[remoteNodeId] !== undefined){
      return that.remoteNodes[remoteNodeId];
    }

    this.initializeRemoteNode(remoteNodeId, function(err, remoteTTNNode){
      if (err) { return log.error(err); }
      that.rememberRemoteNode(remoteTTNNode);
      if (callback){ callback(null, remoteTTNNode); }
    });
  },

  rememberRemoteNode: function(remoteTTNNode){
    this.nodeConfig.remoteNodes = this.nodeConfig.remoteNodes || [];

    if (!_.findWhere(this.nodeConfig.remoteNodes, {id: remoteTTNNode.nodeId})){
      this.nodeConfig.remoteNodes.push({ "id": remoteTTNNode.nodeId });
      this.persistNodeConfig();
    }
  },

  initializeRESTServer: function(){
    var that = this;

    this.restServer = (new RestServerFactory()).instance(this.nodeKeys, this.ttnNodeInfo.restProtocol);

    this.restServer.get('/', function(req,res,next){
      var info = {
        "nodeId": that.nodeId,
        "nodeAddress": that.getNodeAddress(),
        "trackers": that.nodeConfig.trackers||[]
      }
      if (that.dhtNode.nodeKeys){
        info.publicKey =  that.dhtNode.nodeKeys.getPublicKey();
      }
      res.send(info);
      return next();
    });

    this.restServer.get('/tracker/:trackerId', function(req, res, next) {
      if (that.trackers[req.params.trackerId] === undefined){
        res.send(404);
      } else {
        res.send(that.trackers[req.params.trackerId].getJSON());
      }
      return next();
    });

    this.restServer.get('/tracker/:trackerId/thing/:id', function(req, res, next) {
      if (that.trackers[req.params.trackerId] === undefined){
        res.send(404);
      } else {
        res.send(that.trackers[req.params.trackerId].getThingSync(req.params.id)||404);
      }
      return next();
    });

    this.restServer.get('/tracker/:trackerId/thing/:id/version/:version', function(req, res, next) {
      if (that.trackers[req.params.trackerId] === undefined){
        res.send(404);
      } else {
        res.send(that.trackers[req.params.trackerId].getThingSync(req.params.id,req.params.version)||404);
      }
      return next();
    });

    this.restServer.get('/tracker/:trackerId/subtracker/:id', function(req, res, next) {
      if (that.trackers[req.params.trackerId] === undefined){
        res.send(404);
      } else {
        res.send(that.trackers[req.params.trackerId].getSubTracker(req.params.id)||404);
      }

      return next();
    });

    this.restServer.get(/\/tracker\/?.*/, restify.serveStatic({
      directory: GLOBAL.dataPath
    }));
  },

  startRESTServer: function(){
    var restServer = this.restServer;
    restServer.listen(this.config.RESTServer.port, function() {
      restServer.emit('initialized', restServer.name, restServer.url);
      restServer.initialized = true;
    });
  },

  configureEventListeners: function(){
    var that = this;
    var dhtNode = this.dhtNode;

    dhtNode.on(dhtNode.events.joined, function(){
      eventbus.emit(eventbus.events.dhtNode.joined);
      log.info('node joined the network, id = ' + dhtNode.getID() + ', address = ' + dhtNode.getAddress());
    })
    .on(dhtNode.events.joining, function(){
      log.debug('node joining network...');
    })
    .on(dhtNode.events.connected, function(){
      log.debug('node connected to network.');
      dhtNode.join();
    })
    .on(dhtNode.events.initialized, function(){
      log.debug('dhtNode service initialized.');

      if (that.config.startup.joinDHT == 'true'){
        that.joinDHTNetwork();
      }
      if (that.config.startup.startRESTServer == 'true'){
        that.startRESTServer();
      }
    })
    .on(dhtNode.events.disconnected, function(node){
      log.warn('node disconnected from network.');
    });
  },

  joinDHTNetwork: function(){
    if (!this.dhtNode){
      return;
    }
    this.dhtNode.connect();
  },

  shutdown:  function(cb){
    log.info("Shutting down TTN Node.");

    if (this.restServer){
      this.restServer.close();
    }

    if (this.dhtNode){
      this.dhtNode.disconnect(cb);
    }
  },

  getExternalIPAddress: function(){
    return this.ttnNodeInfo.externalIPAddress;
  },

  addTracker: function(tracker){
    if (tracker === undefined) {
      throw new Error("Attempt to add tracker to ttn node with no data.");
    }
    this.trackers[tracker.id] = tracker;
    this.emit(this.events.trackerAdded, tracker);
  },

  getTracker: function(trackerId){
    var nodeId = this.trackerNodeIndex[trackerId];
    if (nodeId === undefined){
      throw new Error("Invalid node id. Unable to find node for tracker " + trackerId);
    }
    if (nodeId === this.nodeId){
      return this.trackers[trackerId];
    }
    var remoteNode = this.remoteNodes[nodeId];
    return remoteNode.getTracker(trackerId);
  },

  getLocalTrackers: function(){
    return this.trackers;
  },

  getLocalTracker: function(id){
    return this.trackers[id];
  },

  getNodeId: function(){
    return this.nodeId;
  },

  getNodeAddress: function(){
    return this.getExternalIPAddress() + ":" + this.config.dht.port;
  },

  createNewTracker: function(newTrackerJSON){
    //NOTE: newTrackerJSON is not an instance of tracker.js, rather a JSON object from AngularJS
    var that = this;
    if (newTrackerJSON === undefined){
      log.error("Attempt to create new tracker with undefined values.");
      return;
    }

    var shasum = Crypto.createHash('sha1');
    var key = this.getNodeId() + Crypto.randomBytes(256).toString('hex');
    shasum.update(key);
    var newId = shasum.digest('hex');

    //TODO - check if tracker already exists, gen another id

    if (!fs.existsSync(GLOBAL.dataPath + "/tracker/")){
      fs.mkdirSync(GLOBAL.dataPath + "/tracker/");
    }

    var newTrackerPath = GLOBAL.dataPath + "/tracker/" + newId;
    fs.mkdirSync(newTrackerPath);

    var newTrackerConfigPath = newTrackerPath + "/tracker.json"

    var trackerJSON = {
      "version": 0,
      "id": newId,
      "ttnNodeId": this.getNodeId(),
      "title": newTrackerJSON.title,
      "description": newTrackerJSON.description,
      "things": []
    };

    var payload = JSON.parse(JSON.stringify(trackerJSON));
    payload.signature = this.nodeKeys.sign(JSON.stringify(payload));

    fs.outputJsonSync(newTrackerConfigPath, payload);

    this.nodeConfig.trackers.push({
        "id": newId,
        "title": newTrackerJSON.title,
        "description": newTrackerJSON.description
      });

    this.persistNodeConfig();

    var tracker = new Tracker(GLOBAL.dataPath+ "/tracker/" + newId+"/tracker.json", function(t){
      that.addTracker(t);
      that.trackerNodeIndex[trackerId] = that.nodeId;
    })
  },

  stats: function(){
    this.emit(this.events.displayStats,{
      "dhtConnected": (this.dhtNode.isConnected()),
      "restServerConnected": (this.restServer.initialized !== undefined && this.restServer.initialized),
      "ttnNodeId": this.getNodeId(),
      "ttnNodeAddress":  this.getNodeAddress(),
      "peerCount" : this.dhtNode.peerCount(),
      "bucketCount" : this.dhtNode.kBucketCount(),
      "bootstraps" : this.dhtNode.bootstrapList(),
      "peerList" : this.dhtNode.peerList()
    })
  },

  findNodeAsync: function(nodeId, callback){
    this.dhtNode.getNodeAsync(nodeId, callback);
  },

  findNodeByAddressAsync: function(nodeRESTAddress, callback){
    var that = this;
    var client = restify.createJsonClient({url: nodeRESTAddress});

    var cb = function(nodeJSON){

      var nodeAddress = nodeJSON.address.replace("0.0.0.0", "127.0.0.1");

      that.dhtNode.pingNodeAsync(nodeJSON.nodeId, nodeAddress, function(success){
        if (!success){
          log.error("Unable to ping remote node with address: " + nodeAddress);
          return;
        }
        that.dhtNode.getNodeAsync(nodeJSON.nodeId, callback);

      });
      client.close();
    };

    client.get("/node", function(err, req, res, nodeJSON) {
        if (err) {
          log.error("Error retrieving remote node. "+err);
          throw err;
        }
        cb(nodeJSON);
      });

  },

  persistNodeConfig: function(){
    fs.outputJson(this.nodeConfigPath, this.nodeConfig, function(err){
      if (err) return log.error("Error persisting node config.", err);
    });
  },

  addTrackerToNodeConfig: function(nodeId, tracker){
    var remoteTrackers = this.nodeConfig.remoteTrackers || [];
    var remoteTracker = _.findWhere(remoteTrackers, {'id':tracker.id, 'ttnNodeId':nodeId});
    if (remoteTracker === undefined){
      remoteTrackers.push({
        "id": tracker.id,
        "ttnNodeId": nodeId,
        "title": tracker._trackerJSON.title,
        "description": tracker._trackerJSON.description
      });
      this.persist();
    }
  },

  getRemoteTrackerAsync: function(nodeId, trackerId, callback){
    var that = this;

    this.dhtNode.getNodeAsync(nodeId, function(remoteDhtNode){
      new RemoteTracker(nodeId, trackerId, remoteDhtNode, function(tracker){
        that.addTracker(tracker);
        tracker.persist();

        that.addTrackerToNodeConfig(nodeId, tracker);

        if (callback) {
          callback(tracker);
        }
      });
    });
  },

  getRemoteTrackerFromURL: function(remoteTrackerURL, callback){
    var that = this;
    new RemoteTrackerPlaceholderTTNNode(remoteTrackerURL, function(err, remoteTrackerPlaceholderTTNNode){
      if (err) { return callback(err); }

      that.remoteNodes[remoteTrackerPlaceholderTTNNode.nodeId] = remoteTrackerPlaceholderTTNNode;
      that.rememberRemoteNode(remoteTrackerPlaceholderTTNNode);
      process.nextTick(function() { that.emit(that.events.remoteNodeAdded, remoteTrackerPlaceholderTTNNode); });

      _.each(remoteTrackerPlaceholderTTNNode.getTrackers(), function(remoteTracker, index, list){
        that.trackerNodeIndex[remoteTracker.id] = remoteTrackerPlaceholderTTNNode.nodeId;
      });

      if (callback){ callback(null, remoteTrackerPlaceholderTTNNode); }
    });
  },

});
