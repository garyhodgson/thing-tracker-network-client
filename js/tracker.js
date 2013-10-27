var klass = require('klass'),
    _ = require('underscore'),
    fs = require("fs"),
    path = require("path");

var Tracker = module.exports = klass({

  initialize: function(tracker) {
    if (tracker === undefined) throw Error("No tracker");

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

  getThing: function(id){
    var thingRef = _.find(this._tracker.things||[], function(it){ return it.id == id; });
    if (_.isUndefined(thingRef)){
      return undefined;
    }

    if (_.isUndefined(thingRef['ref-url'])){
      return thingRef;
    }

    if (!fs.existsSync('./data/'+thingRef['ref-url'])){
      return thingRef;
    }

    var thing = JSON.parse(fs.readFileSync('./data/'+thingRef['ref-url']));

    return thing;
  },

  getSubTracker: function(id){
    return _.find(this._tracker.trackers||[], function(it){ return it.id == id; })
  }

});