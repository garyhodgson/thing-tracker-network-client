var RemoteTTNNode = require('./js/remote-ttn-node');

angular.module('TTNClientApp.controllers').controller('NodeCtrl', ['$scope', '$timeout', 'ttnNode', function($scope, $timeout, ttnNode) {

  $scope.thisNodeId = ttnNode.getNodeId();
  $scope.trackers = ttnNode.trackers;
  $scope.remoteNodes = ttnNode.remoteNodes;
  $scope.thingsSummary = [];

  ttnNode.on(ttnNode.events.initialized, function(){
    console.log("ttnNode.events.initialized");

    $timeout(function(){
      $scope.trackers = ttnNode.trackers;
      $scope.remoteNodes = ttnNode.remoteNodes;
    });
  })
  .on(ttnNode.events.trackerRemoved, function(){
    console.log("ttnNode.events.trackerRemoved");
    $timeout(function(){
      $scope.trackers = ttnNode.trackers;
    });
  })
  .on(ttnNode.events.trackerAdded, function(){
    console.log("ttnNode.events.trackerAdded");
    $timeout(function(){
      $scope.trackers = ttnNode.trackers;
    });
  });

  eventbus.on(eventbus.events.tracker.online, function(trackerId){
    console.log(trackerId + " is online");
  });

  $scope.showRemoteTrackers = function(remoteNode){
    $timeout(function(){
        $scope.trackers = remoteNode.getTrackers();
    });
  };

  $scope.showLocalTrackers = function(){
    $timeout(function(){
        $scope.trackers = ttnNode.getLocalTrackers();
    });
  };

  $scope.getRemoteTracker = function(nodeId, trackerId){
    nodeId = nodeId.trim();
    trackerId = trackerId.trim();
    ttnNode.getRemoteTrackerAsync(nodeId, trackerId, function(tracker){
      $timeout(function(){
          $scope.trackers[tracker.id] = tracker;
      });
    });
  };

  $scope.getRemoteNode = function(nodeId){
    ttnNode.getRemoteNode(nodeId, function(err, remoteTTNNode){
      if (err) {
        return log.error(err);
      }
      $timeout(function(){
        $scope.remoteNodes = ttnNode.remoteNodes;
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

  $scope.getRemoteTrackerFromURL = function(remoteTrackerURL){
    ttnNode.getRemoteTrackerFromURL(remoteTrackerURL, function(err, remoteTrackerPlaceholderTTNNode){
      if (err) {
        return log.error(err);
      }
      $timeout(function(){
        $scope.remoteNodes = ttnNode.remoteNodes;
      });
    });
  };

}])