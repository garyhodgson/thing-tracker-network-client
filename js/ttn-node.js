var Tracker = require('./tracker'),
    RemoteTracker = require('./remote-tracker'),
    DHTService = require('./dht-service'),
    RestServerFactory = require('./rest-server-factory'),
    restify = require('restify'),
    DHTNode = require("./dht-node"),
    NodeKeys = require("./node-keys"),
    _ = require('underscore'),
    fs = require('fs'),
    Class = require('jsclass/src/core').Class,
    EventEmitter = require('events').EventEmitter,
    log = require('kadoh/lib/logging').ns('TTNNode'),
    Crypto = require("crypto"),
    eventbus = require('./event-bus');

var TTNNode = module.exports = new Class(EventEmitter, {

  events: {
    initialized: 'initialized',
    displayStats: 'displayStats',
    foundNode: 'foundNode',
    trackerAdded:   "trackerAdded",
    trackerRemoved: "trackerRemoved"
  },

  initialize: function(config) {
    var that = this;
    this.config = config;

    //sigh
    GLOBAL.dataPath = config.dataPath;

    var nodeId = null;

    if (config.transient!=="true"){
      var nodeKeys = this.nodeKeys = new NodeKeys(config.dataPath);
      nodeId = nodeKeys.getPublicKeyHash();
    } else {
      nodeId = "transient";
    }

    this.nodeId = nodeId;

    var dhtNode = this.dhtNode = new DHTNode(nodeId, {
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

    if (config.transient!=="true"){
      dhtNode.nodeKeys = nodeKeys;
    }

    var restServer = this.restServer = (new RestServerFactory()).instance(nodeKeys, dhtNode.trackerInfo.restProtocol);

    var dhtService = this.dhtService = new DHTService(dhtNode, restServer);

    var nodeConfigPath = this.nodeConfigPath = config.dataPath + "/" + nodeId+ ".json";
    if (!fs.existsSync(nodeConfigPath)){
      fs.writeFileSync(nodeConfigPath, JSON.stringify({
        "nodeId": nodeId,
        "trackers": [],
        "dataPath": config.dataPath
      }));
    }
    this.nodeConfig =  JSON.parse(fs.readFileSync(nodeConfigPath));

    this.trackers = {};
    _.each(this.nodeConfig.trackers, function(tracker, index, list){
      var trackerId = tracker.id;
      if (trackerId !== undefined){
        new Tracker(that.nodeConfig.dataPath+"/tracker/"+trackerId+"/tracker.json", function(tracker){
          that.trackers[trackerId] = tracker;
          process.nextTick(function() { that.emit(that.events.trackerAdded, tracker); });
        });
      }
    });

    this.restServer.get('/', function(req,res,next){
      var info = {
        "nodeId": nodeId,
        "nodeAddress": dhtNode._address.replace('0.0.0.0','127.0.0.1'),
        "trackers": that.nodeConfig.trackers||[]
      }
      if (dhtNode.nodeKeys){
        info.publicKey =  dhtNode.nodeKeys.getPublicKey();
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

    /* Wire up events */

    this.restServer.on('initialized', function(name, url){
      log.debug(name + ' listening at ' + url);
    });

    dhtService.on(dhtService.events.joined, function(){
      eventbus.emit(eventbus.events.dhtService.joined);
      log.info('node joined the network, id = ' + dhtNode.getID() + ', address = ' + dhtNode.getAddress());

      _.each(that.nodeConfig.remoteTrackers, function(tracker, index, list){
        var trackerId = tracker.id;
        var nodeId = tracker.ttnNodeId;
        if (trackerId === undefined){
          return log.warn("Unable to initialize remote tracker, no trackerId.", tracker);
        }
        if (nodeId === undefined){
          return log.warn("Unable to initialize remote tracker, no nodeId.", tracker);
        }
        new RemoteTracker(trackerId, undefined, function(tracker){
          that.trackers[trackerId] = tracker;
          that.emit(that.events.trackerAdded, tracker);
        });

        that.dhtService.getNodeAsync(nodeId, function(dhtNode){
          console.log("dhtNode = ",dhtNode);
          if (dhtNode === undefined){
            log.warn("Unable to find DHT Node " + nodeId);
          }
          that.trackers[trackerId].setDhtNode(dhtNode);
        });
      });


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

  getLocalTrackers: function(){
    return this.trackers;
  },

  getLocalTracker: function(id){
    return this.trackers[id];
  },

  createNewTracker: function(newTracker){
    var that = this;
    if (newTracker === undefined){
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
      "title": newTracker.title,
      "description": newTracker.description,
      "things": []
    };

    var payload = JSON.parse(JSON.stringify(trackerJSON));
    payload.signature = this.nodeKeys.sign(JSON.stringify(payload));

    fs.writeFileSync(newTrackerConfigPath, JSON.stringify(payload, null, 4));

    this.nodeConfig.trackers.push(newId);

    fs.writeFileSync(this.nodeConfigPath, JSON.stringify(this.nodeConfig, null, 4));

    var tracker = new Tracker(GLOBAL.dataPath+ "/tracker/" + newId+"/tracker.json", function(t){
      that.addTracker(t);
    })

  },

  getNodeId: function(){
    return this.nodeId;
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

  findNodeByAddressAsync: function(nodeRESTAddress, callback){
    var that = this;
    var client = restify.createJsonClient({url: nodeRESTAddress});

    var cb = function(nodeJSON){

      var nodeAddress = nodeJSON.address.replace("0.0.0.0", "127.0.0.1");

      that.dhtService.pingNodeAsync(nodeJSON.nodeId, nodeAddress, function(success){
        if (!success){
          log.error("Unable to ping remote node with address: " + nodeAddress);
          return;
        }
        that.dhtService.getNodeAsync(nodeJSON.nodeId, callback);

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

  addTracker: function(tracker){
    if (tracker === undefined) throw Error("Attempt to add null tracker.");

    log.info("added new tracker with id: "+ tracker.id);
    this.trackers[tracker.id] = tracker;
    this.emit(this.events.trackerAdded, tracker);
  },

  getTracker: function(id){
    return this.trackers[id];
  },

  getRemoteTrackerAsync: function(nodeId, trackerId, dhtService, callback){
    var that = this;

    dhtService.getNodeAsync(nodeId, function(dhtNode){
      new RemoteTracker(trackerId, dhtNode, function(tracker){
        that.addTracker(tracker);
        tracker.persist();
        if (callback) {
          callback(tracker);
        }
      });
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

  removeRemoteTrackerAsync: function(trackerId, callback){

    //TODO - careful! Should we have a check to ensure that local trackers cannot be deleted?
    delete this.trackers[trackerId];

    this.emit(this.events.trackerRemoved, trackerId);

    callback();

  },
});
