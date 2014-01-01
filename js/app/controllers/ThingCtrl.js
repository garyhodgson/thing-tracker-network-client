var log = require('kadoh/lib/logging').ns('ThingCtrl');


angular.module('TTNClientApp.controllers').controller('ThingCtrl', ['$scope', '$location', '$routeParams', 'ttnNode',  'urlRegExp', function($scope, $location, $routeParams, ttnNode, urlRegExp) {

    var thingId = $routeParams.thingId;
    var trackerId = $routeParams.trackerId;
    var version = $routeParams.version;

    if (thingId === undefined){
      log.error("No Thing ID given.");
      $location.path( "/" );
    };

    if (trackerId === undefined){
      log.error("No Tracker ID given.");
      $location.path( "/" );
    };

    $scope.dataPath = ttnNode.config.dataPath;
    $scope.tracker = ttnNode.getTracker(trackerId);

    if ($scope.tracker === undefined){
      log.error("Unable to find tracker for thing: " +thingId);
      $location.path( "/" );
      return;
    }

    $scope.tracker.getThing(thingId, version, function(thing){
      if (thing === undefined){
        log.error("Unable to find local thing with id: "+ thingId + " and version: " + version);
        $location.path( "/" );
        return;
      }
      thing.isCachedLocally = $scope.tracker.isThingCachedLocally(thing);
      $scope.thing = thing;
    });

    $scope.downloadThing = function(){
      $scope.tracker.downloadThing($scope.thing, function(downloadPath){
        console.log("downloadPath = ",downloadPath);
        gui.Shell.openItem(downloadPath);
      });
    };

    $scope.openBOMItem = function(itemLocation){
      if (urlRegExp.test(itemLocation)){
        gui.Shell.openItem(itemLocation);
      } else {
        gui.Shell.openItem(fs.realpathSync($scope.dataPath+"/"+itemLocation));
      }
    };

    $scope.showBOMItem = function(itemLocation){
      if (urlRegExp.test(itemLocation)){
        gui.Shell.showItemInFolder(itemLocation);
      } else {
        gui.Shell.showItemInFolder(fs.realpathSync($scope.dataPath+"/"+itemLocation));
      }
    };



  }])