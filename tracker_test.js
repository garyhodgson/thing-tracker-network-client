var Class = require('jsclass/src/core').Class,
    _ = require('underscore'),
    fs = require("fs"),
    path = require("path"),
    TTNService = require('./js/ttn-service'),
    UI = require('./js/ui/console-ui'),
    eventbus = require('./js/event-bus'),
    LocalTracker = require('./js/tracker'),
    RemoteTracker = require('./js/remote-tracker');

var urlRegexp = new RegExp(/^(?!mailto:)(?:(?:https?|ftp):\/\/)?(?:\S+(?::\S*)?@)?(?:(?:(?:[1-9]\d?|1\d\d|2[01]\d|22[0-3])(?:\.(?:1?\d{1,2}|2[0-4]\d|25[0-5])){2}(?:\.(?:[0-9]\d?|1\d\d|2[0-4]\d|25[0-4]))|(?:(?:[a-z\u00a1-\uffff0-9]+-?)*[a-z\u00a1-\uffff0-9]+)(?:\.(?:[a-z\u00a1-\uffff0-9]+-?)*[a-z\u00a1-\uffff0-9]+)*(?:\.(?:[a-z\u00a1-\uffff]{2,})))|localhost)(?::\d{2,5})?(?:\/[^\s]*)?$/i);

var ui = new UI({level:'info'});
/*
var RemoteTracker = new Class({

  initialize: function(nodeId, ttnService, callback) {
    var that = this;
    this.ttnService = ttnService;
    this._trackerJSON;

    ttnService.getRemoteTracker(nodeId, function(t){
      that._trackerJSON = t;
      if (callback){
        callback(that);
      }
    });
  },

  getThingSummary: function(id, callback){
    callback(_.findWhere(this._trackerJSON.things, {'id':id}));
  },

  getThing: function(id, version, callback){
    this.ttnService.getRemoteThing(this._trackerJSON.ttnNodeId, id, version, callback);
  }
});

var LocalTracker = new Class({
  initialize: function(trackerLocation, config, callback) {
    var that = this;

    this._trackerJSON;

    this._dataPath = config.dataPath;
    if (!fs.existsSync(this._dataPath+trackerLocation)){
      throw Error("Unable to read tracker from " + this._dataPath+trackerLocation)
    }
    this._trackerJSON = JSON.parse(fs.readFileSync(this._dataPath+trackerLocation));

    if (callback){
      callback(that);
    }
  },

  getThingSummary: function(id, callback){
    if (callback){
      callback(_.findWhere(this._trackerJSON.things, {'id':id}));
    }
  },

  getThingLatestVersion: function(id){

    var thingJSON = _.findWhere(this._trackerJSON.things, {id: id});

    if (thingJSON && thingJSON.latestVersion){
        return thingJSON.latestVersion
    }
  },

  getThing: function(id, version, callback){
    if (callback === undefined){
      log.warn("No callback method given");
      return;
    }

    if (_.isUndefined(version)){
      version = this.getThingLatestVersion(id);
    }

    if (_.isUndefined(version)){
      console.error("Unable to determine latest version for Thing with id: "+ id);
      callback(undefined);
    }

    var thingFilename = this._dataPath+'/thing/'+id+'/'+version+'/thing.json';
    if (!fs.existsSync(thingFilename)){
      console.error("Unable to find local thing with id: "+ id + " and version: " + version);
      callback(undefined);
    }

    callback(JSON.parse(fs.readFileSync(thingFilename)));

  }
});*/

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
