var dir = require('node-dir');

angular.module('TTNClientApp.controllers').controller('NewThingCtrl', ['$scope', '$location', '$routeParams', 'ttnNode',  'urlRegExp', function($scope, $location, $routeParams, ttnNode, urlRegExp) {

  var shasum = Crypto.createHash('sha1');
  var key = Crypto.randomBytes(256).toString('hex');
  shasum.update(key);
  var newId = shasum.digest('hex');

  $scope.tracker = ttnNode.getLocalTracker($routeParams.trackerId);

  if ($scope.tracker === undefined){
    log.error("No tracker selected");
    $location.path( "/" );
  };

  $scope.files = [];
  $scope.thumbnailUrls = [];

  $scope.editedThing = {};

  if ($routeParams.thingId !== undefined){
    $scope.editedThing = $scope.tracker.getThingSync($routeParams.thingId);
    $scope.editedThing.isNew = false;

    _.each($scope.editedThing.thumbnailUrls, function(value, index, list){
      $scope.thumbnailUrls.push($scope.dataPath + value);
    });
  } else {
    $scope.editedThing.isNew = true;
  }

  _.defaults($scope.editedThing, {
      id: newId,
      title: "",
      version: "",
      description: "",
      licenses: [],
      tags: [],
      url: "",
      authors: [],
      billOfMaterials: [],
      instructions: [],
      relationships: []
    });


  function cleanThingJSON(localThing){
   _.each(localThing, function(v,k){
    // remove empty arrays and objects
      if ((_.isArray(v) || _.isObject(v)) && _.isEmpty(v)) {
        delete localThing[k];
      } else if (_.isString(k)){

        // remove angular and client contamination
        if ((k.substr(0,2) == "$$") ||(k == "isNew")){
          delete localThing[k];
          return;
        }
      } else if (_.isObject(v)){
        cleanThingJSON(v);
      }
    })
  }

  $scope.saveThing = function(){
    var now = new Date();
    if (!this.editedThing.created) {
      this.editedThing.created = now.toJSON();
    }
    this.editedThing.updated = now.toJSON();
    //Run twice to clear 2 levels of possble empty objects, e.g. xInstructionMetadata.note
    cleanThingJSON(this.editedThing);
    cleanThingJSON(this.editedThing);

    $scope.tracker.updateThing(this.editedThing, $scope.files, $scope.thumbnailUrls, function(err, thing){
      if (err){
        return log.error(err);
      }
      $location.path( "/tracker/" + $scope.tracker.id + "/thing/" + thing.id);
    });

  }

  $scope.thumbnailFilesChanged = function(files) {
    this.thumbnailUrls  = files.split(";");
    $scope.$apply();
  }

  function addFiles(sourcePath, targetPath){
    var fsStat = fs.statSync(sourcePath);

    if (fsStat.isDirectory()){
      var dirname = path.basename(sourcePath);

      dir.paths(sourcePath, true, function(err, paths) {
        if (err) throw err;
        _.each(paths, function(item, list){
          var tp = path.join(targetPath||"", dirname);
          addFiles(item, tp);
        })
      });

    } else {
      var filename = path.basename(sourcePath);
      var targetFilepath = path.join(targetPath||"", filename);
      $scope.files.push({sourcePath:sourcePath, targetPath: targetFilepath});

      var urlTargetFilePath =  targetFilepath.replace("\\", "/");
      var url = "/tracker/" + $scope.tracker.id + "/thing/" + $scope.editedThing.id + "/version/"+$scope.editedThing.version+"/content/" + urlTargetFilePath;

      $scope.editedThing.billOfMaterials.push({
        "$isContentFile": true,
        "partNumber": $scope.editedThing.billOfMaterials.length+1,
        "url": url,
        "description": urlTargetFilePath,
        "quantity": 1,
        "unit": "EA",
        "xBOMMetadata":{
          "note": ""
        }
      });

      $scope.$apply();
    }

  }

  $scope.addFiles = function(files){
    if (!files)return;

    _.each(files.split(";"), function(file, index, list){
      addFiles(file);
    });

    $scope.$apply();
  };

  $scope.addDir = function(dir){
    if (!dir)return;
    addFiles(dir);
    $scope.$apply();
  };

  $scope.removeFile = function(index){
    this.files.splice(index,1);
  };


  $scope.addAuthor = function(){
    this.editedThing.authors.push({"name": "", "email": "", "web": ""});
  };

  $scope.removeAuthor = function(index){
    this.editedThing.authors.splice(index,1);
  };

  $scope.addMaterial = function(){
    this.editedThing.billOfMaterials.push({
        "partNumber": this.editedThing.billOfMaterials.length+1,
        "description": "",
        "quantity": "",
        "unit": "",
        "xBOMMetadata":{
          "note": ""
        }
      });
  };

  $scope.removeMaterial = function(index){
    var material = this.editedThing.billOfMaterials[index];

    var materialIsContentFile = material["$isContentFile"] === true;
    if (materialIsContentFile){
      _.each(this.files, function(file, fileIndex, list){
        if (!file)return;
        if (file.targetPath === material.description){
          $scope.files.splice(fileIndex, 1);
        }
      });
    }

    this.editedThing.billOfMaterials.splice(index,1);

    _.each(this.editedThing.billOfMaterials, function(item, index, list){
      item.partNumber = index+1;
    });
  };

  $scope.addInstruction = function(){
    this.editedThing.instructions.push({
        "step": this.editedThing.instructions.length+1,
        "text": "",
        "xInstructionMetadata":{
          "note": ""
        }
      });
  };

  $scope.removeInstruction = function(index){
    this.editedThing.instructions.splice(index,1);
  };

  $scope.addRelationship = function(){
    this.editedThing.relationships.push({
        "description": "",
        "url": ""
      });
  };

  $scope.removeRelationship = function(index){
    this.editedThing.relationships.splice(index,1);
  };

}])