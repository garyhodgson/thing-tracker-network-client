var RemoteTTNNode = require('./js/remote-ttn-node');

angular.module('TTNClientApp.controllers').controller('NodeCtrl', ['$scope', '$timeout', 'ttnNode', function($scope, $timeout, ttnNode) {

  var trackerService = ttnNode.trackerService;

  $scope.getNode = function(nodeId){
    nodeId = nodeId.trim();

    new RemoteTTNNode(nodeId, ttnNode.dhtService, function(ttnNode){
      console.log("ttnNode = ",ttnNode);
    });


    /*trackerService.getRemoteTrackersAsync(nodeId, ttnNode.dhtService, function(trackers){
      $timeout(function(){
        _.each(trackers, function(tracker){
          $scope.trackers[tracker.id] = tracker;
        });
      });
    });*/
  };

  $scope.removeNode = function(nodeId){
    nodeId = nodeId.trim();
    trackerService.removeRemoteTrackerAsync(nodeId, function(err){
      if (err) {
        log.error(err);
        return;
      }

      $timeout(function(){
        delete $scope.trackers[nodeId];
      });
    });
  };

    $scope.showThings = function(tracker){
      if (tracker === undefined){
        log.error("Unable to show things as no tracker was given.");
        return;
      }

      log.info("showing things for tracker with id " + tracker);

      $scope.thingsSummary.splice(0,$scope.thingsSummary.length);

      tracker.mapThingsSummary(function(thingSummary){
        $timeout(function(){
          $scope.thingsSummary.push(thingSummary);
        });
      });
    };

    $scope.navigateToThingURL = function(url){
      gui.Shell.openExternal(url);
    };

}])