var fs = require("fs")
var nStore = require('nstore');
var _ = require("underscore");
var crypto = require("kadoh/lib/util/crypto")


var logging = require('kadoh/lib/logging');
var ConsoleLogger = require('kadoh/lib/logger/reporter/color-console')

var argv  = require('optimist')
            .usage('Usage: $0 -b 127.0.0.1:3001 -l debug --cli -p 9880 -d ./data')
            .alias('b', 'bootstraps')
            .describe('b', 'comma separated list of bootstraps')
            .alias('l', 'log')
            .describe('l', 'log level (debug, info, warn, error, fatal)')
            .alias('c', 'cli')
            .describe('c', 'start repl')
            .alias('p', 'port')
            .describe('p', 'port')
            .alias('h', 'help')
            .describe('h', 'help')
            .alias('d', 'data')
            .describe('d', 'path where data is stored.')
            .argv;

if (argv.h){
  console.log(require('optimist').help());
  return
}

var dataPath = global.dataPath = argv.d||'./data';

var keys = require("./genkeys").keys

new ConsoleLogger(logging, argv.l||'info');
log = logging.ns('CLI');

nStore = nStore.extend(require('nstore/query')());

process.listening = true;
process.env.KADOH_TRANSPORT = 'udp';

var TTNNode = require("./ttn-node");
var bootstraps = argv.b||'127.0.0.1:3001'
var node = new TTNNode(keys.public_hash, {
    bootstraps : bootstraps.split(','),
    reactor : {
      protocol  : 'jsonrpc2',
      transport : {
        port      : parseInt(argv.port, 10) || 9880,
        reconnect : true
      }
    }
  })

var trackerStore = nStore.new('data/trackerStore.db', function () {
    log.info("trackerStore loaded");

    trackerStore.all(function(err, results){
      log.info('trackerStore.all...');
      log.info(_.keys(results));
    });

    init();
  });


function init(){
  node.connect(function() {
    log.info("connected");

    node.join(function() {
      log.info('joined TTN. node id = ' + node.getID());
      log.info('node address =' + node.getAddress())

      publishTrackers(node);
    });
  });
}


function publishTrackers(node){

  var tracker = JSON.parse(getTracker())
  var trackerString = JSON.stringify(tracker)

  var trackerKey = crypto.digest.SHA1(trackerString);

  log.info("trackerKey = ",trackerKey);

  trackerStore.get(trackerKey, function(err, doc, key){
    if (err) {
      log.warn("key not found in store");
      trackerStore.save(trackerKey, tracker, function(){
          log.info("tracker added to store");
      })
    }

    log.debug(tracker);

    node.put(trackerKey, trackerString, null, function(key){
      log.debug("key = ",key);
      if (key){
        log.info("put tracker with key: " + key);
      } else {
        log.error("Error publishing tracker");
      }
    }, this)

 });

}



function getTracker(){
  var tracker = fs.readFileSync("./data/trackers/tracker.json")

  return tracker.toString();
}



exports.node = node;

if (argv.cli){
  log.info("Starting REPL...")
  require('repl').start('> ').context.node = node;
}
