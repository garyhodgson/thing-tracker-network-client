var Class = require('jsclass/src/core').Class,
    _ = require('lodash'),
    RemoteTTNNode = require('./remote-ttn-node'),
    TTNNode = require('./ttn-node'),
    NodelessTracker = require('./nodeless-tracker'),
    fs = require("fs-extra"),
    Crypto = require("crypto"),
    restify = require('restify'),
    url = require('url'),
    log = require('kadoh/lib/logging').ns('RemoteTrackerPlaceholderTTNNode');

var RemoteTrackerPlaceholderTTNNode = module.exports = new Class(RemoteTTNNode, {

  events: {
    initialized: "initialized",
    trackerAdded: "trackerAdded"
  },

  initialize: function(remoteTrackerURL, callback) {

    var remotePlaceholder = this;
    this.trackers = {};
    var shasum = Crypto.createHash('sha1');
    shasum.update(remoteTrackerURL);
    this.nodeId = shasum.digest('hex');
    this.nodeLocation = GLOBAL.dataPath+"/cache/node/" + this.nodeId + "/node.json";

    this.url = url.parse(remoteTrackerURL);

    if (!GLOBAL.skipCache && fs.existsSync(this.nodeLocation)){
      this._nodeJSON = fs.readJsonSync(this.nodeLocation);
      this._populateTrackers(callback);
    } else {

      var client = restify.createJsonClient({url: this.url.protocol + "//" + this.url.host});

      var cb = function(remoteTrackerJSON){

        remoteTrackerJSON.title = remoteTrackerJSON.title || remoteTrackerURL;
        remoteTrackerJSON.id = remoteTrackerJSON.id || this.nodeId;

        var trackerSummary = JSON.parse(JSON.stringify(remoteTrackerJSON));

        if (trackerSummary.hasOwnProperty('things')){
          delete trackerSummary.things;
        }

        if (trackerSummary.hasOwnProperty('trackers')){
          delete trackerSummary.trackers;
        }

        remotePlaceholder._nodeJSON = {
          "nodeId" : this.nodeId,
          "url": remoteTrackerURL,
          "trackers": [
            trackerSummary
          ]
        }
        remotePlaceholder.persist();
        remotePlaceholder._populateTrackers([remoteTrackerJSON], callback);
        client.close();
      }

      client.get(this.url.pathname, function(err, req, res, remoteTrackerJSON) {
        if (err) return callback(err);
        cb(remoteTrackerJSON);
      });
    }
  },

  _populateTrackers: function(trackers, callback){
    var that = this;
    _.each(trackers, function(trackerJSON, index, list){

      var trackerId = trackerJSON.id;
      new NodelessTracker(that.nodeId, trackerId, trackerJSON, function(err, tracker){
        if (err){ return callback(err); }

        that.addTracker(tracker);
        tracker.persist();
      });
    });

    if (callback !== undefined){
      callback(null, that);
    }
    process.nextTick(function() { that.emit(that.events.initialized) });
  },

})