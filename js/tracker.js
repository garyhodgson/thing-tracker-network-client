var Class = require('jsclass/src/core').Class,
    _ = require('underscore'),
    fs = require("fs"),
    log = require('kadoh/lib/logging').ns('Tracker'),
    path = require("path");
var NodeKeys = require("./node-keys");


var Tracker = module.exports = new Class({

  initialize: function(trackerLocation, config, callback) {
    var that = this;

    this._trackerJSON;

    this._dataPath = config.dataPath;
    this._nodeKeys = new NodeKeys(this._dataPath);
    this.remote = false;
    this.isRoot = true;

    if (!fs.existsSync(this._dataPath+trackerLocation)){
      throw Error("Unable to read tracker from " + this._dataPath+trackerLocation)
    }
    this._trackerJSON = JSON.parse(fs.readFileSync(this._dataPath+trackerLocation));
    this.id = this._trackerJSON.ttnNodeId;

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

  getThingSync: function(id, version){

    if (_.isUndefined(version)){
      version = this.getThingLatestVersion(id);
    }

    if (_.isUndefined(version)){
      console.error("Unable to determine latest version for Thing with id: "+ id);
      return undefined;
    }

    var thingFilename = this._dataPath+'/tracker/'+this.id+'/thing/'+id+'/'+version+'/thing.json';

    if (!fs.existsSync(thingFilename)){
      console.error("Unable to find local thing with id: "+ id + " and version: " + version);
      return undefined;
    }

    return JSON.parse(fs.readFileSync(thingFilename));

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

    var thingFilename = this._dataPath+'/tracker/'+this.id+'/thing/'+id+'/'+version+'/thing.json';
    if (!fs.existsSync(thingFilename)){
      console.error("Unable to find local thing with id: "+ id + " and version: " + version);
      callback(undefined);
    }

    callback(JSON.parse(fs.readFileSync(thingFilename)));

  },

  getJSON: function(){
    var payload = JSON.parse(JSON.stringify(this._trackerJSON));
    payload.signature = this._nodeKeys.sign(JSON.stringify(payload));
    return payload;
  },

  mapThingsSummary: function(callback){
    if (this._trackerJSON === undefined){
      return;
    }
    var that = this;

    _.each(this._trackerJSON.things, function(thing, index, list){
      callback({
        trackerId: that.id,
        id: thing.id,
        title: thing.title,
        summary: thing.summary,
        thumbnailURL: thing.thumbnailURL||undefined
      });
    });
  },

  getSubTracker: function(id){
    if (this._trackerJSON === undefined){
      return;
    }
    return _.find(this._trackerJSON.trackers||[], function(it){ return it.id == id; })
  },

  getDownloadPath: function(thing){
    if (!thing){
      log.error("Attempt to get download path with an undefined thing reference.");
      return undefined;
    }
    return fs.realpathSync(this._dataPath+"/tracker/"+this.id+"/thing/"+thing.id+"/"+thing.version+"/content/");
  },

  isCachedLocally: function(thing){
    return fs.existsSync(this.getDownloadPath(thing));
  },

  downloadThing: function(thing, callback){
    if (!thing){
      log.error("Attempt to download content with an undefined thing reference.");
      return;
    }

    var downloadPath = this.getDownloadPath(thing);

    if (!fs.existsSync(downloadPath)){
      log.error("Local tracker missing content at: " + downloadPath);
      return;
    }

    callback(downloadPath);
  }

});