var RemoteTTNNode = require('./js/remote-ttn-node');

angular.module('TTNClientApp.controllers').controller('NodeCtrl', ['$scope', '$timeout', '$rootScope', 'ttnNode', function($scope, $timeout, $rootScope, ttnNode) {

  $scope.thisNodeId = ttnNode.getNodeId();
  $scope.thisNodeDescription = ttnNode.getNodeDescription();

  $scope.trackers = ttnNode.trackers;
  $scope.remoteNodes = ttnNode.remoteNodes;
  $scope.thingsSummary = [];
  $scope.dhtOnline = ttnNode.dhtNode.isJoined();

  $scope.paginatedThingsSummary = [];
  $scope.totalItems = 0;
  $scope.currentPage = 1;
  $scope.maxSize = 5;
  $scope.numPerPage = 10;

  $scope.setPage = function (pageNo) {
    $scope.currentPage = pageNo;
  };

  $rootScope.currentTrackerId = $rootScope.currentTrackerId || undefined;
  $rootScope.currentNodeId = $rootScope.currentNodeId || undefined;

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

  eventbus.on(eventbus.events.dhtNode.joined, function(trackerId){
    $scope.dhtOnline = ttnNode.dhtNode.isJoined();
  });


  $scope.showRemoteTrackers = function(remoteNode){
    $timeout(function(){
      $rootScope.currentNodeId = remoteNode.nodeId;
      $scope.trackers = remoteNode.getTrackers();
    });
  };

  $scope.showLocalTrackers = function(){
    $timeout(function(){
      $rootScope.currentNodeId = $scope.thisNodeId;
      $scope.trackers = ttnNode.getLocalTrackers();
    });
  };

  $scope.getRemoteTracker = function(nodeId, trackerId){
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

  $scope.onPageThings = function(page){
    $scope.currentPage = page;
    $scope.showThingsPage();
  };

  $scope.showThings = function(tracker){
    if (tracker === undefined){
      log.error("Unable to show things as no tracker was given.");
      return;
    }

    $rootScope.currentTrackerId = tracker.id;

    $scope.currentTracker = tracker;

    $scope.totalItems = tracker.getThingsSummaryCount();
    $scope.currentPage = 1;

    $scope.showThingsPage();

  };

  $scope.showThingsPage = function(){

    $scope.thingsSummary = [];

    var begin = (($scope.currentPage - 1) * $scope.numPerPage);
    var end = begin + $scope.numPerPage;

    $scope.currentTracker.mapThingsSummary(begin, end, function(thingSummary){
      console.log(thingSummary);

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

  $scope.pingRemoteNode = function(remoteNode){
    var id = remoteNode.getID()
    remoteNode.online = undefined;
    remoteNode.ping(function(err, isAlive){
      if (err){
        return log.warn(err);
      }
      remoteNode.online = isAlive;
      if (isAlive === true){
        log.info("Node "+id+" is alive.");
      } else {
        log.info("Node "+id+" is not alive.");
      }
    });
  };

  $scope.refreshRemoteNode = function(remoteNode){
    var id = remoteNode.getID()
    if (!remoteNode.online){
      return log.info("Node "+id+" is not online.");
    }
    remoteNode.refresh(function(err, remoteNode){
      if (err){
        return log.warn(err);
      }
      log.info("Node "+id+" refreshed.");
    });
  };

  $scope.announce = function(message){
    ttnNode.dhtNode.ttnKadohNode.announce(message);
  };

  if ($rootScope.currentNodeId){
    if ($rootScope.currentNodeId == $scope.thisNodeId){
      $scope.showLocalTrackers();
    } else {
      $scope.showRemoteTrackers($scope.remoteNodes[$rootScope.currentNodeId]);
    }

    if ($rootScope.currentTrackerId){
      $timeout(function(){
        $scope.showThings($scope.trackers[$rootScope.currentTrackerId]);
      });
    }
  }

}])