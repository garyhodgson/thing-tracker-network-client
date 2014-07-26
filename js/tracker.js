var Class = require('jsclass/src/core').Class,
    eventbus = require('./event-bus'),
    _ = require('lodash'),
    fs = require("fs-extra"),
    log = require('kadoh/lib/logging').ns('Tracker'),
    async = require("async"),
    admzip = require('adm-zip'),
    backgrounder = require("backgrounder"),
    path = require("path");

var Tracker = module.exports = new Class({

  initialize: function(trackerLocation, callback) {
    var that = this;

    this.trackerLocation = trackerLocation;
    this.remote = false;

    if (!fs.existsSync(trackerLocation)){
      throw Error("Unable to read tracker from " + trackerLocation)
    }

    this._trackerJSON = JSON.parse(fs.readFileSync(trackerLocation));
    this.id = this._trackerJSON.id;

    if (callback){
      callback(that);
    }
  },

  getThingsCount: function(){
    return this._trackerJSON.things.length;
  },

  getID: function(){
    return this._trackerJSON.id;
  },

  getTitle: function(){
    return this._trackerJSON.title;
  },

  getDescription: function(){
    return this._trackerJSON.description;
  },


  persist: function(){
    var that = this;
    fs.outputJson(this.trackerLocation, this._trackerJSON, function(err){
      if (err){
        return log.error(err);
      }
      log.info("Tracker "+that.id+" persisted");
    });
  },

  addThingSummaryToTracker: function(thingJSON){
    if (this._trackerJSON.things === undefined){
      this._trackerJSON.things = []
    }

    if (thingJSON.id){
      var thingSummary = _.find(this._trackerJSON.things, {'id':thingJSON.id});
      if (thingSummary){
        var index = this._trackerJSON.things.indexOf(thingSummary);
        this._trackerJSON.things[index]  = thingJSON;
      } else {
        this._trackerJSON.things.push(thingJSON);
      }
    } else {
      this._trackerJSON.things.push(thingJSON);
    }

    this.persist();
  },

  updateThing: function(newThing, files, thumbnailPaths, callback){

    var that = this;
    var thingAddress = "/tracker/" + this.id + "/thing/" + newThing.id + "/version/" + newThing.version;
    var thingLocation = GLOBAL.dataPath + thingAddress;
    var thingContentLocation = thingLocation + "/content/";
    var thingThumbnailsLocation = thingLocation + "/thumbnail/";
    var thingThumbnailUrl = thingAddress+ "/thumbnail/";
    var thingZipUrl = thingAddress + "/" + newThing.id + "_" + newThing.version +".zip";
    var thingZipLocation = GLOBAL.dataPath + thingZipUrl;

    if (_.isString(newThing.tags)){
      newThing.tags = newThing.tags.split(",");
    }

    if (_.isString(newThing.licenses)){
      newThing.licenses = newThing.licenses.split(",");
    }

    newThing.downloadUrl = thingZipUrl;
    newThing.thumbnailUrls = _.map(thumbnailPaths, function(thumbnailPath){ return thingThumbnailUrl + path.basename(thumbnailPath); });


    fs.outputJson(thingLocation+"/thing.json", newThing, function(err){
      if (err){
        return callback(err);
      }
      that.addThingSummaryToTracker({
        "id": newThing.id,
        "title": newThing.title,
        "refUrl": "/tracker/"+that.id+"/thing/"+newThing.id,
        "latestVersion": newThing.version,
        "versions": [newThing.version],
        "thumbnailUrl": newThing.thumbnailUrls[0]||"",
        "description": newThing.description
        });
      callback(null, newThing);
    });

    fs.mkdirs(thingContentLocation, function(err){
      if (err) {
        return log.error(err);
      }

      async.each(files, function(file, onErrorCallback){
        var filePath = file.sourcePath;
        if (!fs.existsSync(filePath)) {
          return onErrorCallback("Could not find file: " + filePath);
        }

        fs.copy(filePath, thingContentLocation + file.targetPath , function(err){
          if (err) {
            onErrorCallback("Could not copy file: "+ filePath + ", err: " + err);
          }
          onErrorCallback(null);
        });
      }, function(err){
        if (err) {
          return log.error("File copy error: " + err);
        }
        log.info("Zipping content store");

        var worker = backgrounder.spawn(__dirname + "/zipper.js")
        worker.send({
            "thingContentLocation": thingContentLocation,
            "thingZipLocation": thingZipLocation
          }, function(err, realPath){
            if (err){
              log.error(err);
            } else {
              log.info("Zipping finished. ", realPath);
            }
            worker.terminate();
        });

      });
    });

    fs.mkdirs(thingThumbnailsLocation, function(err){
      if (err) {
        return log.error(err);
      }

      async.each(thumbnailPaths, function(thumbnailPath, onErrorCallback){
        if (!fs.existsSync(thumbnailPath)){
          return onErrorCallback("Could not find thumbnail: " + thumbnailPath);
        }
        var targetThumbnailPath = thingThumbnailsLocation + path.basename(thumbnailPath);
        if(thumbnailPath == targetThumbnailPath){
          return;
        }

        fs.copy(thumbnailPath, targetThumbnailPath, function(err){
          if (err) {
            onErrorCallback("Could not copy thumbnail: "+ thumbnailPath + ", err: " + err);
          }
          onErrorCallback(null);
        });
      });
    });

  },

  getThingSummary: function(id, callback){
    if (callback){
      callback(_.findWhere(this._trackerJSON.things, {'id':id}));
    }
  },

  getThingSummarySync: function(id){
    return _.findWhere(this._trackerJSON.things, {'id':id});
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

    var thingFilename = GLOBAL.dataPath+'/tracker/'+this.id+'/thing/'+id+'/version/'+version+'/thing.json';

    console.log("thingFilename = ",thingFilename);

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
      callback("Unable to determine latest version for Thing with id: "+ id, undefined);
    }

    var thingFilename = GLOBAL.dataPath+'/tracker/'+this.id+'/thing/'+id+'/version/'+version+'/thing.json';
    if (!fs.existsSync(thingFilename)){
      callback("Unable to find thing metadata at: " + thingFilename);
    }

    callback(null, JSON.parse(fs.readFileSync(thingFilename)));

  },

  getJSON: function(){
    return this._trackerJSON;
  },

  mapThingsSummary: function(begin, end, callback){
    if (this._trackerJSON === undefined){
      log.warn("Unable to map things summary - no JSON found for tracker: " + this.id)
      return;
    }
    var that = this;

    _.each(this._trackerJSON.things.slice(begin, end), function(thing, index, list){
      callback({
        trackerId: that.id,
        id: thing.id,
        remote: that.remote,
        title: thing.title,
        summary: thing.description,
        thumbnailUrl: thing.thumbnailUrl||undefined
      });
    });
  },


  getThingsSummaryCount: function(){
    if (!this._trackerJSON || !this._trackerJSON.things){
      return 0
    }
    return this._trackerJSON.things.length;
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
    return fs.realpathSync(GLOBAL.dataPath+"/tracker/"+this.id+"/thing/"+thing.id+"/version/"+thing.version+"/content/");
  },

  isThingCachedLocally: function(thing){
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