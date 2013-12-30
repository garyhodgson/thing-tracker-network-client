var logging = require('kadoh/lib/logging'),
    AngularConsole = require('./js/ui/angular-console'),
    eventbus = require('./js/event-bus'),
    gui = require('nw.gui'),
    fs = require('fs-extra'),
    path = require('path'),
    _ = require('underscore'),
    Crypto = require("crypto"),
    RemoteTracker = require('./js/remote-tracker');

_.templateSettings = { interpolate: /\{\{(.+?)\}\}/g };

angular.module('TTNClientApp.controllers', []).controller('AppCtrl', ['$scope', '$timeout', '$sanitize', 'ttnNode','argv', 'urlRegExp', function($scope, $timeout, $sanitize, ttnNode, argv, urlRegExp) {
  $scope.dataPath = ttnNode.config.dataPath;
  $scope.messages = [];
  $scope.notifier = alertify;
  $scope.trackers = {};
  $scope.thingsSummary = [];
  $scope.stats = {};

  $scope.statsTooltip = "";

  new AngularConsole(logging, argv.l||'info', $scope, $timeout, $sanitize);

  ttnNode.on(ttnNode.events.displayStats, function(stats){
   $scope.stats = stats;
   $scope.statsTooltip = _.template(
    "{{ peerCount }} nodes in {{ bucketCount }} {{ bucketCount>1?'buckets':'bucket' }}.",
    $scope.stats);
  });

  ttnNode.on(ttnNode.events.foundNode, function(nodeId, node){
    if (node){
      log.info("Found node with id: "+nodeId);
    } else {
      log.error("Unable to find node with id: " + nodeId);
    }
  });

  ttnNode.on(ttnNode.events.initialized, function(){
    log.debug("ttnNode.events.initialized");

    $timeout(function(){
      $scope.trackers = ttnNode.trackers;
    });
  })
  .on(ttnNode.events.trackerRemoved, function(){
    log.debug("ttnNode.events.trackerRemoved");
    $timeout(function(){
      $scope.trackers = ttnNode.trackers;
    });
  })
  .on(ttnNode.events.trackerAdded, function(){
    log.debug("ttnNode.events.trackerAdded");
    $timeout(function(){
      $scope.trackers = ttnNode.trackers;
    });
  });

  eventbus.on(eventbus.events.dhtService.joined, function(){
    ttnNode.stats();
  });

  eventbus.on(eventbus.events.tracker.trackerOnline, function(trackerId){
    log.info("tracker online: ",trackerId);
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
    ttnNode.getRemoteTrackerAsync(nodeId, trackerId, ttnNode.dhtService, function(tracker){
      $timeout(function(){
          $scope.trackers[tracker.id] = tracker;
      });
    });
  };

}]);