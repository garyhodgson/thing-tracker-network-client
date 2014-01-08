var Class = require('jsclass/src/core').Class,
    eventbus = require('./event-bus'),
    _ = require('lodash'),
    fs = require("fs-extra"),
    log = require('kadoh/lib/logging').ns('Tracker'),
    async = require("async"),
    admzip = require('adm-zip'),
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
    this._trackerJSON.things.push(thingJSON);
    this.persist();
  },

  createThing: function(newThing, files, thumbnailPaths){

    var that = this;
    var thingAddress = "/tracker/" + this.id + "/thing/" + newThing.id + "/version/" + newThing.version;
    var thingLocation = GLOBAL.dataPath + thingAddress;
    var thingContentLocation = thingLocation + "/content/";
    var thingThumbnailsLocation = thingLocation + "/thumbnail/";
    var thingThumbnailURL = thingAddress+ "/thumbnail/";
    var thingZipURL = thingAddress + "/" + newThing.id + "_" + newThing.version +".zip";
    var thingZipLocation = GLOBAL.dataPath + thingZipURL;

    newThing.downloadURL = thingZipURL;
    newThing.thumbnails = _.map(thumbnailPaths, function(thumbnailPath){ return thingThumbnailURL + path.basename(thumbnailPath); });


    fs.outputJson(thingLocation+"/thing.json", newThing, function(err){
      if (err){
        return log.error(err);
      }
      that.addThingSummaryToTracker({
        "id": newThing.id,
        "title": newThing.title,
        "latestVersion": newThing.version,
        "versions": [newThing.version],
        "thumbnailURL": newThing.thumbnails[0]||"",
        "description": newThing.description
        });
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

        var zip = new admzip();
        var realPath = fs.realpathSync(thingContentLocation);
        zip.addLocalFolder(realPath);
        zip.writeZip(thingZipLocation);

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

        fs.copy(thumbnailPath, thingThumbnailsLocation + path.basename(thumbnailPath), function(err){
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