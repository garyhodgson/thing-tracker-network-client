var klass = require('klass'),
    _ = require('underscore'),
    fs = require("fs"),
    log = require('kadoh/lib/logging').ns('Tracker'),
    path = require("path");

var Tracker = module.exports = klass({

  initialize: function(tracker) {
    if (_.isUndefined(tracker)) throw Error("No tracker");

    if (_.isString(tracker)){
      if (!fs.existsSync(tracker)){
        throw Error("Unable to read tracker from " + tracker)
      }
      this._tracker = JSON.parse(fs.readFileSync(tracker));
    } else if (_.isObject(tracker)){
      this._tracker = tracker;
    } else {
      throw Error("Unrecognised type for tracker.");
    }
  },

  getTracker: function(){
    return this._tracker;
  },

  getThingsSummaryAsync: function(callback){
    var that = this;
    _.each(this._tracker.things, function(thing, index, list){
      var t = that.getThing(thing.id, thing['latestVersion']);
      if (! _.isUndefined(t)){
        callback({
          id: t.id,
          title: t.title,
          thumbnail: t['thumbnails'][0],
          url: t.url
        });
      }
    });
  },

  getThing: function(id, version){

    var v = version;
    if (_.isUndefined(v)){
      var latestVersionFilename = './data/thing/'+id+'/latest';

      if (!fs.existsSync(latestVersionFilename)){
        return undefined;
      }
      v = fs.readFileSync(latestVersionFilename);
    }

    var thingFilename = './data/thing/'+id+'/'+v+'/thing.json';
    if (!fs.existsSync(thingFilename)){
      return undefined;
    }

    var thing = JSON.parse(fs.readFileSync(thingFilename));

    return thing;
  },

  getSubTracker: function(id){
    return _.find(this._tracker.trackers||[], function(it){ return it.id == id; })
  }

});