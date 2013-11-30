var Class = require('jsclass/src/core').Class,
    _ = require('underscore'),
    fs = require("fs"),
    log = require('kadoh/lib/logging').ns('Tracker'),
    path = require("path");

var Tracker = module.exports = new Class({

  initialize: function(trackerLocation, config, callback) {
    var that = this;

    this._trackerJSON;

    this._dataPath = config.dataPath;
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

  },

  getJSON: function(){
    return this._trackerJSON;
  },

  mapThingsSummary: function(callback){
    if (this._trackerJSON === undefined){
      return;
    }
    var that = this;

    _.each(this._trackerJSON.things, function(thing, index, list){
      that.getThing(thing.id, thing.latestVersion, function(t){
        if (! _.isUndefined(t)){
        callback({
          id: t.id,
          title: t.title,
          thumbnail: t.thumbnails?t.thumbnails[0]:undefined,
          url: t.url
        });
      } else {
        callback({
          id: thing.id,
          title: thing.title,
          thumbnail: thing.thumbnails?thing.thumbnails[0]:undefined,
          url: thing.url
        });
      }
      });

    });
  },

  getSubTracker: function(id){
    if (this._trackerJSON === undefined){
      return;
    }
    return _.find(this._trackerJSON.trackers||[], function(it){ return it.id == id; })
  }

});