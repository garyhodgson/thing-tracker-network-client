var logging = require('kadoh/lib/logging'),
    AngularConsole = require('./js/ui/angular-console'),
    eventbus = require('./js/event-bus'),
    gui = require('nw.gui'),
    fs = require('fs');


angular.module('TTNClientApp.controllers', [])

  .controller('AppCtrl', ['$scope', '$timeout', '$sanitize', 'ttnService','argv', 'urlRegExp', function($scope, $timeout, $sanitize, ttnService, argv, urlRegExp) {

    $scope.dataPath = ttnService.config.dataPath;
    $scope.messages = [];
    $scope.thingsSummary = [];
    $scope.tracker = [];
    $scope.stats = {}

    $scope.notifier = alertify;

    new AngularConsole(logging, argv.l||'info', $scope, $timeout, $sanitize);

    ttnService.on(ttnService.events.displayStats, function(stats){
     $scope.stats = stats;
    });

    ttnService.on(ttnService.events.initialized, function(){
      log.debug("ttnService.events.initialized")
      $scope.tracker = ttnService.tracker.getTracker();
      ttnService.tracker.getThingsSummaryAsync(function(thingSummary){
        $scope.thingsSummary.push(thingSummary);
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
      if (toolsForm.followNodeId.value == undefined){
        log.warn("No Node ID given");
        return;
      }
      ttnService.findNode(toolsForm.followNodeId.value);
    };

    $scope.getRemoteTracker = function(){
      log.info("Retrieving tracker for node " + toolsForm.followNodeId.value);
      ttnService.getRemoteTracker(toolsForm.followNodeId.value, function(tracker){
        log.info(tracker);
      });
    };

    $scope.showThing = function(id){
      log.info("Retrieving information for thing " + id);
      var thingJson = ttnService.tracker.getThing(id);
      $scope.things.push(thingJson);
    };

    $scope.navigateToThingURL = function(url){
      gui.Shell.openExternal(url);
    }

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


  }])

  .controller('ThingCtrl', ['$scope', '$location', '$routeParams', 'ttnService',  function($scope, $location, $routeParams, ttnService) {

    if ($routeParams.id == undefined || $routeParams.id == ""){
      log.error("No Thing ID given.");
      $location.path( "/" );
    };

    $scope.dataPath = ttnService.config.dataPath;

    $scope.thing = ttnService.tracker.getThing($routeParams.id, $routeParams.version);

    if ($scope.thing == undefined){
      log.error("Unable to find thing for ID: " + $routeParams.id);
      $location.path( "/" );
    }

    $scope.downloadThing = function(){
      if ($scope.thing['download-url'] != undefined){
        gui.Shell.openItem($scope.thing['download-url']);
      } else {
        log.warn("No download link found.");
      }
    };

    $scope.openBOMItem = function(itemLocation){
      if (urlRegExp.test(itemLocation)){
        gui.Shell.openItem(itemLocation);
      } else {
        gui.Shell.openItem(fs.realpathSync(itemLocation));
      }
    };

    $scope.showBOMItem = function(itemURL){
      if (urlRegExp.test(itemLocation)){
        gui.Shell.showItemInFolder(itemLocation);
      } else {
        gui.Shell.showItemInFolder(fs.realpathSync(itemLocation));
      }
    };



  }])
;