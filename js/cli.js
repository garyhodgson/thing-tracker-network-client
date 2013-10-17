var fs = require("fs")
var nStore = require('nstore');
var _ = require("underscore");
var crypto = require("kadoh/lib/util/crypto")

var keys = require("./genkeys").keys

var logging = require('kadoh/lib/logging');
var ConsoleLogger = require('kadoh/lib/logger/reporter/color-console')

var argv  = require('optimist')
            .usage('Usage: $0 -l debug --repl')
            .alias('l', 'loglevel (debug, info, warn, error, fatal)')
            .alias('repl', 'start node repl')
            .argv;


new ConsoleLogger(logging, argv.l||'info');
log = logging.ns('CLI');

nStore = nStore.extend(require('nstore/query')());

process.listening = true;
process.env.KADOH_TRANSPORT = 'udp';

var TTNNode = require("./ttn-node");

var node = new TTNNode(keys.public_hash, {
    bootstraps : ["127.0.0.1:3001", "ec2-54-234-89-153.compute-1.amazonaws.com:3001"],
    reactor : {
      protocol  : 'jsonrpc2',
      transport : {
        port:9880
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

if (argv.repl){
  log.info("Starting REPL...")
  require('repl').start('> ').context.node = node;
}
