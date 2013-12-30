var logging = require('kadoh/lib/logging'),
    AngularConsole = require('./js/ui/angular-console'),
    eventbus = require('./js/event-bus'),
    gui = require('nw.gui'),
    TTNNode = require('./js/ttn-node'),
    fs = require('fs-extra'),
    path = require('path'),
    _ = require('underscore'),
    Crypto = require("crypto"),
    RemoteTracker = require('./js/remote-tracker');

_.templateSettings = { interpolate: /\{\{(.+?)\}\}/g };

angular.module('TTNClientApp.controllers', []).controller('AppCtrl', ['$scope', '$timeout', '$sanitize', 'ttnService','argv', 'urlRegExp', function($scope, $timeout, $sanitize, ttnService, argv, urlRegExp) {
  $scope.dataPath = ttnService.config.dataPath;
  $scope.messages = [];
  $scope.notifier = alertify;
  $scope.trackers = {};
  $scope.thingsSummary = [];
  $scope.stats = {};
  var trackerService = ttnService.trackerService;

  $scope.statsTooltip = "";

  new AngularConsole(logging, argv.l||'info', $scope, $timeout, $sanitize);

  ttnService.on(ttnService.events.displayStats, function(stats){
   $scope.stats = stats;
   $scope.statsTooltip = _.template(
    "{{ peerCount }} nodes in {{ bucketCount }} {{ bucketCount>1?'buckets':'bucket' }}.",
    $scope.stats);
  });

  ttnService.on(ttnService.events.foundNode, function(nodeId, node){
    if (node){
      log.info("Found node with id: "+nodeId);
    } else {
      log.error("Unable to find node with id: " + nodeId);
    }
  });

  ttnService.on(ttnService.events.initialized, function(){
    log.debug("ttnService.events.initialized");
  });

  trackerService.on(trackerService.events.initialized, function(){
    console.log("trackerService initialized");
    $timeout(function(){
      $scope.trackers = trackerService.trackers;
    });
  })
  .on(trackerService.events.trackerRemoved, function(){
    log.debug("trackerService.events.trackerRemoved");
    $timeout(function(){
      $scope.trackers = trackerService.trackers;
    });
  })
  .on(trackerService.events.trackerAdded, function(){
    log.debug("trackerService.events.trackerAdded");
    $timeout(function(){
      $scope.trackers = trackerService.trackers;
    });
  });

  eventbus.on(eventbus.events.dhtService.joined, function(){
    ttnService.stats();
  });

  $scope.resourcePath = function(itemLocation){
    if (itemLocation == undefined){
      return undefined;
    }

    if (urlRegExp.test(itemLocation)){
      return itemLocation;
    } else {
      return fs.realpathSync($scope.dataPath+itemLocation);
    }
  };

  $scope.getRemoteTracker = function(nodeId, trackerId){
    nodeId = nodeId.trim();
    trackerId = trackerId.trim();
    trackerService.getRemoteTrackerAsync(nodeId, trackerId, ttnService.dhtService, function(tracker){
      $timeout(function(){
          $scope.trackers[tracker.id] = tracker;
      });
    });
  };

}]);