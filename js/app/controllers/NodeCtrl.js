var RemoteTTNNode = require('./js/remote-ttn-node');

angular.module('TTNClientApp.controllers').controller('NodeCtrl', ['$scope', '$timeout', 'ttnNode', function($scope, $timeout, ttnNode) {

  $scope.getNode = function(nodeId){
    nodeId = nodeId.trim();

    new RemoteTTNNode(nodeId, ttnNode.dhtNode, function(ttnNode){
      console.log("ttnNode = ",ttnNode);
    });


    /*ttnNode.getRemoteTrackersAsync(nodeId, ttnNode.dhtNode, function(trackers){
      $timeout(function(){
        _.each(trackers, function(tracker){
          $scope.trackers[tracker.id] = tracker;
        });
      });
    });*/
  };

  $scope.removeNode = function(nodeId){
    nodeId = nodeId.trim();
    ttnNode.removeRemoteTrackerAsync(nodeId, function(err){
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