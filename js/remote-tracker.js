var Class = require('jsclass/src/core').Class,
    _ = require('underscore'),
    fs = require("fs"),
    restify = require('restify'),
    log = require('kadoh/lib/logging').ns('RemoteTracker'),
    path = require("path");

var RemoteTracker = module.exports = new Class({

  initialize: function(nodeId, dhtNode, callback) {
    var that = this;
    this.dhtNode = dhtNode;
    this._trackerJSON;
    this.id = nodeId;
    this._thingCache = {};

    if (dhtNode.tracker !== undefined){
      callback(dhtNode.tracker);
    } else {
      restify.createJsonClient({url: 'http://' + dhtNode._address})
        .get('/tracker', function(err, req, res, remoteTrackerJSON) {
          if (err) throw err;
          that._trackerJSON = remoteTrackerJSON;
          dhtNode.tracker = that;
          callback(that);
        });
    }

  },

  getThingSummary: function(id, callback){
    callback(_.findWhere(this._trackerJSON.things, {'id':id}));
  },

  getThing: function(thingId, version, callback){
    var that = this;

    var target = (version)? '/thing/'+thingId+'/'+version : '/thing/'+thingId;
    restify.createJsonClient({url: 'http://' + this.dhtNode._address})
      .get(target, function(err, req, res, thingJSON) {
        if (err) {
          log.error("Error retrieving remote thing. "+err);
          throw err;
        }
        that._thingCache[thingId+":"+version] = thingJSON;
        callback(thingJSON);
      });
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
      log.warn("Unable to map things summary - no JSON found for tracker: " + this.id)
      return;
    }
    var that = this;

    _.each(this._trackerJSON.things, function(thing, index, list){
      that.getThing(thing.id, thing.latestVersion, function(t){
        if (_.isUndefined(t)){
          callback({
            trackerId: that.id,
            id: thing.id,
            title: thing.title,
            thumbnail: thing.thumbnails?thing.thumbnails[0]:undefined,
            url: thing.url
          });
        } else {
          callback({
           trackerId: that.id,
            id: t.id,
            title: t.title,
            thumbnail: t.thumbnails?t.thumbnails[0]:undefined,
            url: t.url
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