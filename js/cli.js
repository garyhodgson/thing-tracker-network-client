var fs = require("fs-extra"),
    _ = require("lodash"),
    nconf = require('nconf'),
    restify = require('restify'),
    TTNNode = require('./ttn-node'),
    path = require('path'),
    UI = require('./ui/console-ui'),
    net = require("net"),
    repl = require("repl");


var log = require('kadoh/lib/logging').ns('CLI');

var homeDir = process.env.USERPROFILE || process.env.HOME || process.env.HOMEPATH;
var ttnHomeDir = path.normalize(homeDir + "/.ttn");
var configLocation = path.normalize(ttnHomeDir + '/ttn-config.json');
var defaultDataPath = path.normalize(ttnHomeDir+'/data')

var argv  = require('optimist')
            .usage('Usage: $0 <options>')
            .alias('b', 'bootstraps')
            .describe('b', 'comma separated list of bootstraps. Default: 127.0.0.1:3001')
            .alias('l', 'log')
            .describe('l', 'log level (debug, info, warn, error, fatal). Default: info')
            .alias('p', 'port')
            .describe('p', 'port. Default: 9880')
            .alias('r', 'restPort')
            .describe('r', 'Port to run REST server (if different to one given with -p arg). Default: 9880')
            .alias('h', 'help')
            .describe('h', 'help')
            .alias('t', 'ttnroot')
            .describe('t', 'Root TTN directory. Default: ' + ttnHomeDir)
            .alias('c', 'config')
            .describe('c', 'config file. Default: ' + configLocation)
            .alias('d', 'data')
            .describe('d', 'path where data is stored. Default: ' + defaultDataPath)
            .alias('i', 'interactive')
            .describe('i', 'start interactive nodejs repl.')
            .alias('r', 'repl')
            .describe('r', 'start background nodejs repl on a TCP Socket. Default: 50001')
            .alias('n', 'nokeys')
            .describe('n', 'skip key generation. Useful when running the first time to create the default config, and then modifying to use existing keys.')
            .argv;

if (argv.h){
  console.log(require('optimist').help());
  return
}

var ui = new UI({level:argv.l || 'info'});

var configLocation;

if (argv.c) {
  configLocation = argv.c
  nconf.file({ file: configLocation });
} else {

  if (!fs.existsSync(ttnHomeDir)){
    console.log("No ttn home path given. Creating default in user home directory: " + ttnHomeDir);
    fs.mkdirSync(ttnHomeDir);

    if (!fs.existsSync(ttnHomeDir)){
      console.error("Unable to create ttn home dir: " + ttnHomeDir);
      process.exit(1);
    }
  }
}

if (fs.existsSync(configLocation)){
  nconf.file({ file: configLocation });
}


var defaults = {
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
  "dataPath": path.normalize(argv.d || defaultDataPath)
}

if (!argv.n){
  defaults.privateKey = path.normalize(ttnHomeDir+'/id_rsa');
  defaults.publicKey = path.normalize(ttnHomeDir+'/id_rsa.pub');
  defaults.pemCertificate = path.normalize(ttnHomeDir+'/id_rsa.pem');
}

nconf.defaults(defaults);

var config = nconf.load();

if (!fs.existsSync(configLocation)){
  fs.outputJsonSync(configLocation, config);
}


if (!argv.d){
  var dataDir = nconf.get("dataPath");

  if (!fs.existsSync(dataDir)){
    console.log("No data path given and none found in config so far, creating default in user home directory: " + dataDir);
    fs.mkdirSync(dataDir);

    if (!fs.existsSync(dataDir)){
      console.error("Unable to create data dir: " + dataDir);
      process.exit(1);
    }
  }
}

var ttnNode = module.exports = new TTNNode(config);

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
  log.info("Starting interactive REPL...")

  var interactiveRepl = repl.start('> ').on('exit', function () {
    ttnNode.shutdown(function(){
      process.exit();
    });
  });

  interactiveRepl.context.ttnNode = ttnNode;
}


if (argv.r){

  var tcpPort = argv.repl||50001
  log.info("Starting TCP Socket REPL on port "+tcpPort+" ...");

  net.createServer(function (socket) {

    var tcpRepl = repl.start({
      prompt: "ttn> ",
      input: socket,
      output: socket
    }).on('exit', function() {
      log.info("Closing TCP Socket REPL on port "+tcpPort);
      socket.end();
    });

    tcpRepl.context.ttnNode = ttnNode;

  }).listen(tcpPort);
}