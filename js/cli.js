var fs = require("fs"),
    _ = require("lodash"),
    nconf = require('nconf'),
    restify = require('restify'),
    TTNNode = require('./ttn-node'),
    UI = require('./ui/console-ui');


var log = require('kadoh/lib/logging').ns('CLI');

var argv  = require('optimist')
            .usage('Usage: $0 -b 127.0.0.1:3001 -l debug -p 9880 -d ./data')
            .alias('b', 'bootstraps')
            .describe('b', 'comma separated list of bootstraps')
            .alias('l', 'log')
            .describe('l', 'log level (debug, info, warn, error, fatal)')
            .alias('p', 'port')
            .describe('p', 'port')
            .alias('r', 'restPort')
            .describe('r', 'Port to run REST server (if different to one given with -p arg).')
            .alias('h', 'help')
            .describe('h', 'help')
            .alias('c', 'config')
            .describe('c', 'config file.')
            .alias('d', 'data')
            .describe('d', 'path where data is stored.')
            .alias('i', 'interactive')
            .describe('i', 'start nodejs repl')
            .argv;

if (argv.h){
  console.log(require('optimist').help());
  return
}

var ui = new UI({level:argv.l || 'info'});

if (argv.c){
  nconf.file({ file: argv.c });
}

nconf.defaults({
        "dht": {
          "bootstraps" : [argv.b||'127.0.0.1:3001'],
          "port": parseInt(argv.port, 10) || 9880
        },
        "RESTServer" : {
          "port": parseInt(argv.r, 10) || parseInt(argv.port, 10) || 9880
        },
        "startup" : {
          "joinDHT" : "true",
          "startRESTServer" : "true"
        },
        "dataPath": argv.d || './data'
      });

var ttnNode = module.exports = new TTNNode(nconf.load());

ttnNode.on(ttnNode.events.displayStats, function(stats){
    log.info("Stats:\nDHT Connected: " + stats.dhtConnected
    + "\nREST Server Connected: "+ stats.restServerConnected
    + "\nTTN-Node-ID: " + stats.ttnNodeId
    + "\nTTN-Node-Address: " + stats.ttnNodeAddress
    + "\nNodes: " + stats.peerCount + " in " +stats.bucketCount +" buckets."
    + "\nBootstraps: " + stats.bootstraps
    + "\nPeers: " + stats.peerList.join("\n"));
});

ttnNode.on(ttnNode.events.foundNode, function(nodeId, node){
  if (node){
    log.info("Found node with id: " + nodeId +" - "+ node);
  } else {
    log.error("Unable to find node with id: " + nodeId);
  }
});

if (argv.i){
  log.info("Starting REPL...")

  var repl = require('repl').start('> ').on('exit', function () {
    ttnNode.shutdown(function(){
      process.exit();
    });
  });

  repl.context.t = ttnNode;
}