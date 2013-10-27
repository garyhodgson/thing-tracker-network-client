var Tracker = require('./tracker'),
    TrackerService = require('./tracker-service'),
    NodeService = require('./node-service'),
    restify = require('restify'),
    TTNNode = require("./ttn-node"),
    UI = require("./ui");


var server = restify.createServer();

var tracker = new Tracker("data/trackers/tracker.json");

var trackerService = new TrackerService(tracker, server);

var node = new TTNNode(null, {
    bootstraps : ["127.0.0.1:3001"],
    persistence: 'memory',
    reactor : {
      protocol  : 'jsonrpc2',
      transport : {
        port: 10000
      }
    }
  })

var nodeService = new NodeService(node, server);

var ui = new UI();

ui.on(ui.events.initialized, function(type){
  console.log("ui initialized with type: " + type);
})

server.on('initialized', ui.serverEvents.initialized.bind(ui));
nodeService.on(nodeService.events.initialized, ui.nodeServiceEvents.initialized.bind(ui));
trackerService.on(trackerService.events.initialized, ui.trackerServiceEvents.initialized.bind(ui));


server.listen(9880, function() {
  server.emit('initialized', server.name, server.url);
});