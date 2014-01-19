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
  $scope.thumbnails = [];

  $scope.newThing = {
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
  };

  function cleanThingJSON(localThing){
   _.each(localThing, function(v,k){
      if ((_.isArray(v) || _.isObject(v)) && _.isEmpty(v)) {
        delete localThing[k];
      } else if (_.isString(v) && _.isEmpty(v)){
        delete localThing[k];
      } else if (_.isObject(v)){
        cleanThingJSON(v);
      }
    })
  }

  $scope.createThing = function(){
    var now = new Date();
    this.newThing.created = this.newThing.updated = now.toJSON();

    var deangularisedThingClone = angular.fromJson(angular.toJson(this.newThing));

    //Run twice to clear 2 levels of possble empty objects, e.g. xInstructionMetadata.note
    cleanThingJSON(deangularisedThingClone);
    cleanThingJSON(deangularisedThingClone);

    $scope.tracker.createThing(deangularisedThingClone, $scope.files, $scope.thumbnails, function(err, thing){
      if (err){
        return log.error(err);
      }

      log.info("New Thing created: " + thing.id)
      $location.path( "/" );
    });

  };

  $scope.thumbnailFilesChanged = function(files) {
    this.thumbnails  = files.split(";");
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
      var url = "/tracker/" + $scope.tracker.id + "/thing/" + $scope.newThing.id + "/version/"+$scope.newThing.version+"/content/" + urlTargetFilePath;

      $scope.newThing.billOfMaterials.push({
        "$isContentFile": true,
        "partNumber": $scope.newThing.billOfMaterials.length+1,
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
    this.newThing.authors.push({"name": "", "email": "", "web": ""});
  };

  $scope.removeAuthor = function(index){
    this.newThing.authors.splice(index,1);
  };

  $scope.addMaterial = function(){
    this.newThing.billOfMaterials.push({
        "partNumber": this.newThing.billOfMaterials.length+1,
        "description": "",
        "quantity": "",
        "unit": "",
        "xBOMMetadata":{
          "note": ""
        }
      });
  };

  $scope.removeMaterial = function(index){
    var material = this.newThing.billOfMaterials[index];

    var materialIsContentFile = material["$isContentFile"] === true;
    if (materialIsContentFile){
      _.each(this.files, function(file, fileIndex, list){
        if (!file)return;
        if (file.targetPath === material.description){
          $scope.files.splice(fileIndex, 1);
        }
      });
    }

    this.newThing.billOfMaterials.splice(index,1);

    _.each(this.newThing.billOfMaterials, function(item, index, list){
      item.partNumber = index+1;
    });
  };

  $scope.addInstruction = function(){
    this.newThing.instructions.push({
        "step": this.newThing.instructions.length+1,
        "text": "",
        "xInstructionMetadata":{
          "note": ""
        }
      });
  };

  $scope.removeInstruction = function(index){
    this.newThing.instructions.splice(index,1);
  };

  $scope.addRelationship = function(){
    this.newThing.relationships.push({
        "description": "",
        "url": ""
      });
  };

  $scope.removeRelationship = function(index){
    this.newThing.relationships.splice(index,1);
  };

}])