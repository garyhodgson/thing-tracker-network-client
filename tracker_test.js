var Class = require('jsclass/src/core').Class,
    _ = require('underscore'),
    fs = require("fs"),
    path = require("path"),
    TTNService = require('./js/ttn-service'),
    UI = require('./js/ui/console-ui'),
    eventbus = require('./js/event-bus'),
    LocalTracker = require('./js/tracker'),
    RemoteTracker = require('./js/remote-tracker');

var ui = new UI({level:'info'});

var ttnService = new TTNService({
        "dht": {
          "bootstraps" : ['127.0.0.1:3001'],
          "port": 9880
        },
        "RESTServer" : {
          "port": 9880
        },
        "startup" : {
          "joinDHT" : "true",
          "startRESTServer" : "true"
        },
        "transient" : "true",
        "dataPath": './data'
      });


new LocalTracker("/tracker/tracker.json", {dataPath:"./data"}, function(tracker){

  tracker.getThing('48aad9ec08ceee2cfd5b93ebb614e9d9a3f02ffd', undefined, function(ts){
   console.log(ts);
  });

});

eventbus.on(eventbus.events.dhtService.joined, function(){

  new RemoteTracker("0ed43ef50b8d9496414b2d4fa07f87cdc733df6d", ttnService, function(t){
    t.getThing('da39a3ee5e6b4b0d3255bfef95601890afd80709', undefined, function(ts){
      console.log(ts);
    });
  });

});
