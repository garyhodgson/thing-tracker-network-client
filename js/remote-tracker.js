var Class = require('jsclass/src/core').Class,
    eventbus = require('./event-bus'),
    _ = require('underscore'),
    fs = require("fs-extra"),
    restify = require('restify'),
    log = require('kadoh/lib/logging').ns('RemoteTracker'),
    path = require("path"),
    http = require("http"),
    unzip = require("unzip"),
    Crypto = require("crypto"),
    fstream = require("fstream");

var RemoteTracker = module.exports = new Class({

  events: {
    trackerOnline:   "trackerOnline",
    trackerOffline: "trackerOffline"
  },

  initialize: function(trackerId, dhtNode, callback) {
    var that = this;
    this.dhtNode = dhtNode;
    this._trackerJSON;
    this.id = trackerId;
    this.remote = true;
    this.trackerLocation = GLOBAL.dataPath+ "/cache/tracker/" + trackerId + "/tracker.json";

    if (fs.existsSync(this.trackerLocation)){
      this._trackerJSON = JSON.parse(fs.readFileSync(this.trackerLocation));
      this.id = this._trackerJSON.id;

      if (callback !== undefined){
        callback(that);
      }
    } else {
      if (this.dhtNode === undefined){
        return log.warn("Unable to initialize Remote Tracker as DHT Node is undefined. ID = " + trackerId);
      }
      var protocol = dhtNode.ttnNodeInfo.restProtocol||'http';
      var client = restify.createJsonClient({url: protocol+'://' + dhtNode._address});

      var cb = function(tracker){
        if (callback !== undefined){
          callback(tracker);
        }
        client.close();
      }

      client.get('/tracker/'+trackerId, function(err, req, res, remoteTrackerJSON) {
        if (err) throw err;

        // TODO - check if node is verified by user

        if (dhtNode.ttnNodeInfo == undefined){
          log.warn("Unable to verify tracker as dht node has no metadata.");
          remoteTrackerJSON.verified = false;
        } else if (remoteTrackerJSON.signature == undefined){
          log.warn("Unable to verify tracker as no signature was found.");
          remoteTrackerJSON.verified = false;
        } else {
          var verifier = Crypto.createVerify('RSA-SHA256');

          //clone
          var payload = JSON.parse(JSON.stringify(remoteTrackerJSON));
          delete payload.signature
          var signature = remoteTrackerJSON.signature
          verifier.update(JSON.stringify(payload));
          var publicKey = dhtNode.ttnNodeInfo.publicKey;

          remoteTrackerJSON.verified = verifier.verify(publicKey, signature, 'hex');
        }

        if (!remoteTrackerJSON.verified){
          log.warn("Remote tracker is not verified!");
        }

        that._trackerJSON = remoteTrackerJSON;
        cb(that);
      });
    };

    process.nextTick(function() { eventbus.emit( (dhtNode === undefined) ? eventbus.events.tracker.trackerOffline : eventbus.events.tracker.trackerOnline, that.id ); });

  },

  setDhtNode: function(dhtNode){
    this.dhtNode = dhtNode;
    eventbus.emit((dhtNode === undefined) ? eventbus.events.tracker.trackerOffline : eventbus.events.tracker.trackerOnline, this.id );
  },

  persist: function(){

    fs.outputJson(this.trackerLocation, this._trackerJSON, function(err){
      if (err){
        return log.error(err);
      }
      log.info("Tracker Cached");
    });
  },


  getThingSummary: function(id, callback){
    callback(_.findWhere(this._trackerJSON.things, {'id':id}));
  },

  isOnline: function(){
    return (this.dhtNode !== undefined);
  },

  getThing: function(thingId, version, callback){
    var that = this;
    version = version || this.getThingLatestVersion(thingId);
    var thingURL = '/tracker/'+this.id+'/thing/'+thingId+'/version/'+version;

    var cachedThingLocation = GLOBAL.dataPath + "/cache/"+thingURL + "/thing.json";

    if (fs.existsSync(cachedThingLocation)){
      var thingJSON = JSON.parse(fs.readFileSync(cachedThingLocation));
      if (callback !== undefined){
          callback(thingJSON);
        }
    } else {
      if (this.dhtNode === undefined){
        return log.warn("Unable to get Thing as DHT Node is undefined. ID = " + thingId);
      }
      var protocol = (this.dhtNode.ttnNodeInfo&&this.dhtNode.ttnNodeInfo.restProtocol) || 'http';
      var restAddress = (this.dhtNode.ttnNodeInfo&&this.dhtNode.ttnNodeInfo.restServer) || this.dhtNode._address.replace("0.0.0.0","127.0.0.1");
      var client = restify.createJsonClient({url: protocol+'://' + restAddress});

      var cb = function(thingJSON){
        if (callback !== undefined){
          callback(thingJSON);
        }
        client.close();
      };

      client.get(thingURL, function(err, req, res, thingJSON) {
          if (err) {
            log.error("Error retrieving remote thing. "+err);
            throw err;
          }
          console.log("thingJSON = ",thingJSON);

          fs.outputJson(cachedThingLocation, thingJSON, function(err){
            if (err) return log.warn("Error caching remote thing, ", err);
          });

          cb(thingJSON);
        });
    }
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

  isThingCachedLocally: function(thing){
    return false;
  },

  downloadThing: function(thing, callback){
    if (!thing){
      log.error("Attempt to download content with an undefined thing reference.");
      return;
    }

    if (!thing.downloadURL){
      log.error("Attempt to download content with an undefined thing downloadURL.");
      return;
    }

    if (!GLOBAL.dataPath){
      log.error("No data path set!");
      return;
    }

    var url = 'http://' + this.dhtNode._address+thing.downloadURL;

    var filename=path.basename(url);
    var filenameExt = path.extname(filename);

    if (filenameExt != ".zip"){
      log.error("Only zip file downloadable content is handled at the moment. downloadURL points to a file with extension: " + filenameExt);
      return;
    }

    var cacheZipLocation = fs.realpathSync(GLOBAL.dataPath) +"/cache/tracker/"+this.id+"/thing/"+thing.id + "/" + thing.version;
    var cacheContentLocation = cacheZipLocation + "/content/";

    if (!fs.existsSync(cacheContentLocation)){
      fs.mkdirsSync(cacheContentLocation);
    }

    var file = fs.createWriteStream(cacheZipLocation+"/" + filename);

    var outputDirStream = fstream.Writer(cacheContentLocation);

    var request = http.get(url, function(response) {

      response
      .pipe(unzip.Parse())
      .pipe(outputDirStream);

      response
      .pipe(file)

      file.on('finish', function() {
        file.close();

        callback(file);

      });

    });
  }

});