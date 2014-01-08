var Class = require('jsclass/src/core').Class,
    RemoteTracker = require("./remote-tracker"),
    eventbus = require('./event-bus'),
    _ = require('lodash'),
    fs = require("fs-extra"),
    restify = require('restify'),
    url = require('url'),
    log = require('kadoh/lib/logging').ns('NodelessTracker'),
    path = require("path"),
    ttnSpecTools = require("./util/ttn-spec-tools");

var NodelessTracker = module.exports = new Class(RemoteTracker, {

  initialize: function(nodeId, trackerId, trackerJSON, callback) {
    var that = this;
    this.nodeId = nodeId;
    this.id = trackerId;
    this.remote = true;
    this.nodeless = true;
    this.verified = false;
    this.trackerLocation = GLOBAL.dataPath+ "/cache/node/"+nodeId+"/tracker/" + trackerId + "/tracker.json";

    if (!GLOBAL.skipCache && fs.existsSync(this.trackerLocation)){
      this._trackerJSON = JSON.parse(fs.readFileSync(this.trackerLocation));
    } else {
      // correct old spec naming convention.
      this._trackerJSON = ttnSpecTools.fixKeys(trackerJSON);
    }

    if (callback !== undefined){
      callback(null, that);
    }
    process.nextTick(function() { eventbus.emit( eventbus.events.tracker.initialized, that ); });
  },

  getThing: function(thingId, version, callback){
    var that = this;
    version = version || this.getThingLatestVersion(thingId);
    var thingURL = '/tracker/'+this.id+'/thing/'+thingId+'/version/'+version;

    var cachedThingLocation = GLOBAL.dataPath + "/cache/node/" + this.nodeId + thingURL + "/thing.json";

    if (!GLOBAL.skipCache && fs.existsSync(cachedThingLocation)){
      var thingJSON = JSON.parse(fs.readFileSync(cachedThingLocation));
      callback(null, thingJSON);
    } else {

      var thingSummaryJSON = _.findWhere(this._trackerJSON.things, {'id':thingId});

      if (thingSummaryJSON === undefined){
        return callback("Unable to find thingSummaryJSON in tracker for thingId: " + thingId);
      }

      if (thingSummaryJSON.refURL === undefined){
        log.warn("no reference URL to follow, return the summary in the hope it is enough.");
        // no reference URL to follow, return the summary in the hope it is enough.
        return callback(null, thingSummaryJSON);
      }

      var thingRefURL = url.parse(thingSummaryJSON.refURL);

      var client = restify.createJsonClient({url: thingRefURL.protocol + "//" + thingRefURL.host});

      var cb = function(remoteThingJSON){

        try {
          var cleanedRemoteThingJSON = ttnSpecTools.fixKeys(remoteThingJSON);

          console.log("cleanedRemoteThingJSON = ",cleanedRemoteThingJSON);

          fs.outputJson(cachedThingLocation, cleanedRemoteThingJSON, function(err){
            if (err) return log.warn("Error caching remote thing, ", err);
          });

          callback(null, cleanedRemoteThingJSON);
        } finally {
          client.close();
        }
      }

      client.get(thingRefURL.pathname, function(err, req, res, remoteThingJSON) {
        if (err) return callback(err);
        cb(remoteThingJSON);
      });
    }
  },


});