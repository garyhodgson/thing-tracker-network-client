var fs = require("fs")
var keys = require("./genkeys").keys

process.listening = true;
process.env.KADOH_TRANSPORT = 'udp';

var TTNNode = require("./ttn-node");

var node = new TTNNode(keys.public_hash, {
    bootstraps : ["127.0.0.1:3001"],
    reactor : {
      protocol  : 'jsonrpc2',
      transport : {
        port:9880
      }
    }
  })

node.connect(function() {
  $('#info_connected_icon').toggleClass("icon-ban-circle").toggleClass("icon-ok-circle");

  node.join(function() {
    global.success('joined TTN. node id = ' + node.getID());
    $('#info_ttn_node_id').text(node.getID())
    $('#info_joined_icon').toggleClass("icon-ban-circle").toggleClass("icon-ok-circle")
    $('#info_ttn_node_address').text(node.getAddress())
    $('#refreshInfo').click();

    publishTrackers(node);

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
  return fs.readFileSync("./data/trackers/tracker.json")
}



exports.node = node;