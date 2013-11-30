var Class = require('jsclass/src/core').Class,
    _ = require('underscore'),
    fs = require("fs"),
    log = require('kadoh/lib/logging').ns('RemoteTracker'),
    path = require("path");

var RemoteTracker = module.exports = new Class({

  initialize: function(nodeId, ttnService, callback) {
    var that = this;
    this.ttnService = ttnService;
    this._trackerJSON;

    ttnService.getRemoteTracker(nodeId, function(t){
      that._trackerJSON = t;
      that.id = t.ttnNodeId;
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
  },

  getThingLatestVersion: function(id){

    var thingJSON = _.findWhere(this._trackerJSON.things, {id: id});

    if (thingJSON && thingJSON.latestVersion){
        return thingJSON.latestVersion
    }
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
      that.getThing(thing.id, thing.latestVersion, undefined, function(t){
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