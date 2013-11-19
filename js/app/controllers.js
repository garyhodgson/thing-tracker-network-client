var logging = require('kadoh/lib/logging'),
    AngularConsole = require('./js/ui/angular-console'),
    eventbus = require('./js/event-bus'),
    gui = require('nw.gui');


angular.module('TTNClientApp.controllers', [])

  .controller('AppCtrl', ['$scope', '$timeout', 'ttnService','argv', function($scope, $timeout, ttnService, argv) {

    $scope.messages = [];
    $scope.things = [];
    $scope.tracker = [];
    $scope.stats = {}

    $scope.notifier = alertify;

    new AngularConsole(logging, argv.l||'info', $scope, $timeout);

    ttnService.on(ttnService.events.displayStats, function(stats){
     $scope.stats = stats;
    });

    ttnService.on(ttnService.events.initialized, function(){
      log.info("ttnService.events.initialized")
      $scope.tracker = ttnService.tracker.getTracker();
      ttnService.tracker.getThingsAsync(function(thing){
        $scope.things.push(thing);
      });
    });

    ttnService.on(ttnService.events.foundNode, function(nodeId, node){
      if (node){
        log.info("Found node with id: "+nodeId);
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
      if ($scope.followNodeId == undefined){
        log.warn("No Node ID given");
        return;
      }
      ttnService.findNode($scope.followNodeId);
    };

    $scope.getRemoteTracker = function(){
      log.info("Retrieving tracker for node " + $scope.followNodeId);
      /*ttnService.getRemoteTracker($scope.followNodeId, function(tracker){
        log.info(tracker);
      });*/
    };

    $scope.showThing = function(id){
      log.info("Retrieving information for thing " + id);
      var thingJson = ttnService.tracker.getThing(id);
      $scope.things.push(thingJson);
    };

    $scope.navigateToThingURL = function(url){
      gui.Shell.openExternal(url);
    }

  }]);