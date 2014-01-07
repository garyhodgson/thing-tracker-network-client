var logging = require('kadoh/lib/logging'),
    AngularConsole = require('./js/ui/angular-console'),
    eventbus = require('./js/event-bus'),
    gui = require('nw.gui'),
    fs = require('fs-extra'),
    path = require('path'),
    _ = require('lodash'),
    Crypto = require("crypto"),
    RemoteTracker = require('./js/remote-tracker');

angular.module('TTNClientApp.controllers', []).controller('AppCtrl', ['$scope', '$timeout', '$sanitize', 'ttnNode','argv', 'urlRegExp', function($scope, $timeout, $sanitize, ttnNode, argv, urlRegExp) {

  eventbus.on(eventbus.events.app.closeRequest, function(callback){
    alertify.confirm("Confirm Quit", function (e) {
      if (e) {
        ttnNode.leaveDHTNetwork(callback);
      }
    });
  });

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
   $scope.statsTooltip = $scope.stats.peerCount + " nodes in " + $scope.stats.bucketCount + " " + ($scope.stats.bucketCount>1?'buckets':'bucket');
  });

  ttnNode.on(ttnNode.events.foundNode, function(nodeId, node){
    if (node){
      log.info("Found node with id: "+nodeId);
    } else {
      log.error("Unable to find node with id: " + nodeId);
    }
  });

  eventbus.on(eventbus.events.dhtNode.joined, function(){
    ttnNode.stats();
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

}]);