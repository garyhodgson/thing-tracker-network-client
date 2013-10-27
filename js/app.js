var fs = require("fs");
var path = require("path");
var execPath = global.execPath = path.dirname(process.execPath);
var nconf = require('nconf');

var argv  = require('optimist')
            .parse(global.gui.App.argv);

if (argv.d) {
  global.dataPath = argv.d;
} else {
  global.dataPath = './data';
}

if (argv.c) {
  global.configFile = argv.c;
}

console.log("global.configFile = " + global.configFile);

var keys = require("./genkeys").keys;

process.listening = true;
process.env.KADOH_TRANSPORT = 'udp';

var TTNNode = require("./ttn-node");

nconf.file({ file: global.configFile });

if (fs.existsSync(global.gui.App.dataPath + '/ttn-config.json')){
  nconf.file({ file: global.gui.App.dataPath + '/ttn-config.json' })
}

nconf.defaults({
        "bootstraps" : ["127.0.0.1:3001"],
        "port": 9880,
        "startup" : {
          "joinNetwork" : "true",
          "publishTracker" : "true"
        }
      });

var config = nconf.load();

console.log("config('bootstraps') = " + config.bootstraps);

var node = new TTNNode(keys.public_hash, {
    bootstraps : config.bootstraps,
    persistence: 'memory',
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

    var tracker = readJSON(global.dataPath+"/trackers/tracker.json");

    if (tracker){
      console.log("nconf.get(startup:publishTracker) = ",config.startup.publishTracker);
      if (config.startup.publishTracker == 'true'){
        publishTracker(tracker, node);
      }
      if (config.startup.publishThings == 'true'){
        publishThings(tracker, node);
      }

      showMyThings(tracker);
    }

    $('#refreshInfo').click();
  });
});

function showMyThings(tracker){
  if (!tracker) return;

  var things = $('#my-things');
  _.each(tracker.things, function(thing, index, list){
    var thumbnail = thing.thumbnail||'http://placehold.it/64x64';
    var downloadLink = thing['download-url']||'#'
    var dowloadLinkText = thing['download-url']?"<a class='btn downloadLink' data-src='<%=downloadLink%>' src='#' target='_blank'>Download</a>":'';
    things.prepend(_.template("<div class='media' data-ttn-thing-id='<%= thingId %>'>"+
                              "  <a class='pull-left' href='#'><img class='span1 media-object' src='<%= thumbnail %>'></a>"+
                              "  <div class='media-body'>"+
                              "    <h4 class='media-heading'><%= title %></h4>"+
                              "    <p><a class='btn infoLink' data-thing-id='<%= thingId %>' src='#' target='_blank'>More Info</a></p>"+
                              "    <p>"+dowloadLinkText+"</p>"+
                              "  </div>"+
"</div>",
{title: thing.title, thingId: thing.id, thumbnail: thumbnail, downloadLink: downloadLink}) );
  });
}

function publishTracker(tracker, node){

  $('#my-trackers').prepend(_.template("<a class='btn' data-ttn-node-id='<%= nodeId %>'><%= title %></a>", {title: tracker.title, nodeId: tracker['ttn-node-id']}) );

  node.put(null, JSON.stringify(tracker), null, function(key){
    if (key){
      global.success("put tracker with key: " + key);
    } else {
      global.error("Error publishing tracker");
    }
  }, this);

}


function publishThings(tracker, node){
  _.each(tracker.things, function(thing, index, list){

    var thing = readJSON(path.join(global.dataPath, 'things/') + thing.id + '.json')

    if (thing){
      node.put(thing.id, JSON.stringify(thing), null, function(key){
        if (key){
          global.success("put thing with key: " + key);
        } else {
          global.error("Error publishing thing");
        }
      }, this);

    }

  });
}

function readJSON(file){
  var t = fs.readFileSync(file)
  if (!t){
    global.error("Error reading: " + file)
  }
  return JSON.parse(t);
}

exports.node = node;