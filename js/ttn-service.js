var Tracker = require('./tracker'),
    RemoteTracker = require('./remote-tracker'),
    TrackerService = require('./tracker-service'),
    DHTService = require('./dht-service'),
    RestServerFactory = require('./rest-server-factory'),
    restify = require('restify'),
    DHTNode = require("./dht-node"),
    NodeKeys = require("./node-keys"),
    _ = require('underscore'),
    fs = require('fs'),
    Class = require('jsclass/src/core').Class,
    EventEmitter = require('events').EventEmitter,
    log = require('kadoh/lib/logging').ns('TTNService'),
    Crypto = require("crypto"),
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

    var trackerService = this.trackerService = new TrackerService(this.nodeConfig, restServer, dhtService);

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

    /* Wire up events */

    this.restServer.on('initialized', function(name, url){
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

  getLocalTrackers: function(){
    return this.trackerService.trackers;
  },

  getLocalTracker: function(id){
    return this.trackerService.trackers[id];
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
      that.trackerService.addTracker(t);
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

});
