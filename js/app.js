var fs = require("fs");
var path = require("path");
var execPath = global.execPath = path.dirname(process.execPath);
var keys = require("./genkeys").keys;
var nconf = require('nconf');

process.listening = true;
process.env.KADOH_TRANSPORT = 'udp';

var TTNNode = require("./ttn-node");

console.log("execPath: " + execPath)

nconf.file({ file: execPath + '/ttn-config.json' })
      .file({ file: global.gui.App.dataPath + '/ttn-config.json' })
      .defaults({
        "bootstraps" : ["127.0.0.1:3001"],
        "port": 9880,
        "startup" : {
          "joinNetwork" : "true",
          "publishTracker" : "true"
        }
      });

var node = new TTNNode(keys.public_hash, {
    bootstraps : nconf.get('bootstraps'),
    reactor : {
      protocol  : 'jsonrpc2',
      transport : {
        port: nconf.get('port')
      }
    }
  })

node.connect(function() {
  $('#info_connected_icon').toggleClass("icon-ban-circle").toggleClass("icon-ok-circle");

  node.join(function() {
    global.success('joined TTN. node id = ' + node.getID());
    $('#info_ttn_node_id').text(node.getID())
    $('#info_bootstraps').text(node._bootstraps)
    $('#info_joined_icon').toggleClass("icon-ban-circle").toggleClass("icon-ok-circle")
    $('#info_ttn_node_address').text(node.getAddress())
    $('#refreshInfo').click();

    if (nconf.get("startup:publishTracker")){
      publishTrackers(node);
    }

    $('#refreshInfo').click();
  });
});


function publishTrackers(node){

  var tracker = getTracker()

  $('#my-trackers').text(_(tracker).truncate(150));

  node.put(null, tracker.toString(), null, function(key){
    if (key){
      global.success("put tracker with key: " + key);
    } else {
      global.error("Error publishing tracker");
    }
  }, this)

}


function getTracker(){
  return fs.readFileSync(execPath+"/data/trackers/tracker.json")
}



exports.node = node;