var logging = require('kadoh/lib/logging'),
    AngularConsole = require('./js/ui/angular-console'),
    eventbus = require('./js/event-bus');

angular.module('TTNClientApp.controllers', [])

  .controller('AppCtrl', ['$scope', 'ttnService','argv', function($scope, ttnService, argv) {

    $scope.nodeId = "";
    $scope.nodeAddress = "";
    $scope.messages = [];
    $scope.things = [];
    $scope.trackers = [];
    $scope.bootstraps = "";
    $scope.peers = [];
    $scope.peersCount =  0;
    $scope.kBuckets = 0;
    $scope.dhtConnected = false;
    $scope.restServerConnected = false;

    $scope.notifier = alertify;

    new AngularConsole(logging, argv.l||'info', $scope);

    ttnService.on(ttnService.events.displayStats, function(stats){
      $scope.nodeId = stats.ttnNodeId;
      $scope.nodeAddress = stats.ttnNodeAddress;
      $scope.peersCount = stats.peerCount;
      $scope.kBuckets = stats.bucketCount;
      $scope.peers = stats.peerList;
      $scope.bootstraps = stats.bootstraps;
      $scope.dhtConnected = stats.dhtConnected;
      $scope.restServerConnected = stats.restServerConnected;
    });

    ttnService.on(ttnService.events.foundNode, function(nodeId, node){
      if (node){
        log.info("Found node with id: "+nodeId +" - "+ node);
      } else {
        log.error("Unable to find node with id: " + nodeId);
      }
    });

    eventbus.on(eventbus.events.dhtService.joined, function(){
      ttnService.stats();
    });

    $scope.put = function(){
      ttnService.node.put(null, toolsForm.putValue.value, null, function(v){
        log.info(v)
      })
    };

    $scope.get = function(){
      ttnService.node.get(toolsForm.getValue.value, function(v){
        log.info(v)
      })
    };

    $scope.refreshInfo = function(){
      ttnService.stats();
    };

    $scope.followNode = function(){
      ttnService.findNode($scope.followNodeId);
    }

  }]);