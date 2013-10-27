var fs = require("fs"),
    _ = require("underscore"),
    crypto = require("kadoh/lib/util/crypto"),
    Tracker = require('./tracker'),
    TrackerService = require('./tracker-service'),
    NodeService = require('./node-service'),
    restServer = require('./rest-server'),
    UI = require("./ui"),
    nconf = require('nconf'),
    TTNNode = require("./ttn-node"),
    NodeKeys = require("./node-keys");

var argv  = require('optimist')
            .usage('Usage: $0 -b 127.0.0.1:3001 -l debug -p 9880 -d ./data')
            .alias('b', 'bootstraps')
            .describe('b', 'comma separated list of bootstraps')
            .alias('l', 'log')
            .describe('l', 'log level (debug, info, warn, error, fatal)')
            .alias('p', 'port')
            .describe('p', 'port')
            .alias('h', 'help')
            .describe('h', 'help')
            .alias('c', 'config')
            .describe('c', 'config file.')
            .alias('d', 'data')
            .describe('d', 'path where data is stored.')
            .alias('t', 'transient')
            .describe('t', 'do not generate or persist keys')
            .argv;


if (argv.h){
  console.log(require('optimist').help());
  return
}

ui = new UI({level:argv.l || 'info'})

global.dataPath = argv.d || './data';
global.configFile = argv.c;

if (global.configFile){
  nconf.file({ file: global.configFile });
}
nconf.defaults({
        "bootstraps" : [argv.b||'127.0.0.1:3001'],
        "port": parseInt(argv.port, 10) || 9880,
        "startup" : {
          "joinDHT" : "true",
          "publishTracker" : "true",
          "startRESTServer" : "true"
        }
      });

var config = nconf.load();

var nodeId = null;

if (!argv.t){
  var nodeKeys = new NodeKeys(global.dataPath);
  nodeId = nodeKeys.getPublicKeyHash();
}

var node = new TTNNode(nodeId, {
    bootstraps : config.bootstraps,
    reactor : {
      protocol  : 'jsonrpc2',
      transport : {
        port      : config.port,
        reconnect : true
      }
    }
  })

var nodeService = new NodeService(node, restServer);
var tracker = new Tracker(global.dataPath+"/trackers/tracker.json");
var trackerService = new TrackerService(tracker, restServer);

restServer.on('initialized', ui.serverEvents.initialized.bind(ui));

nodeService.on(nodeService.events.joined, function(){
  ui.nodeServiceEvents.joined.call(ui, node.getID(), node.getAddress());

  if (config.startup.publishTracker == 'true'){
    publishTrackers(node);
  }
});

nodeService.on(nodeService.events.connected, function(){
  ui.nodeServiceEvents.connected.call(ui, node);
  nodeService.join();
});

nodeService.on(nodeService.events.initialized, function(){
  ui.nodeServiceEvents.initialized.call(ui, node);
  if (config.startup.joinDHT == 'true'){
    nodeService.connect();
  }
  if (config.startup.startRESTServer == 'true'){
    restServer.listen(9880, function() {
      restServer.emit('initialized', restServer.name, restServer.url);
    });
  }
});


function publishTrackers(node){

  var tracker = JSON.parse(getTracker())

  node._tracker = tracker;

  var trackerString = JSON.stringify(tracker);

  node.put(null, trackerString, null, function(key){
    if (key){
      ui.log.info("put tracker with key: " + key);
    } else {
      ui.log.error("Error publishing tracker");
    }
  }, this)

}



function getTracker(){
  var tracker = fs.readFileSync("./data/trackers/tracker.json")

  return tracker.toString();
}

exports.node = node;

ui.log.info("Starting REPL...")
require('repl').start('> ').context.node = node;