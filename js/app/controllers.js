var logging = require('kadoh/lib/logging'),
    AngularConsole = require('./js/ui/angular-console'),
    eventbus = require('./js/event-bus'),
    gui = require('nw.gui'),
    fs = require('fs'),
    RemoteTracker = require('./js/remote-tracker');


angular.module('TTNClientApp.controllers', [])

  .controller('AppCtrl', ['$scope', '$timeout', '$sanitize', 'ttnService','argv', 'urlRegExp', function($scope, $timeout, $sanitize, ttnService, argv, urlRegExp) {
    $scope.dataPath = ttnService.config.dataPath;
    $scope.messages = [];
    $scope.notifier = alertify;
    $scope.thingsSummary = [];
    $scope.trackers = [];
    $scope.stats = {}

    new AngularConsole(logging, argv.l||'info', $scope, $timeout, $sanitize);

    ttnService.on(ttnService.events.displayStats, function(stats){
     $scope.stats = stats;
    });

    ttnService.on(ttnService.events.foundNode, function(nodeId, node){
      if (node){
        log.info("Found node with id: "+nodeId);
      } else {
        log.error("Unable to find node with id: " + nodeId);
      }
    });

    ttnService.on(ttnService.events.initialized, function(){
      log.debug("ttnService.events.initialized")
      $scope.trackers.push(ttnService.tracker);
      ttnService.tracker.mapThingsSummary(function(thingSummary){
        $scope.thingsSummary.push(thingSummary);
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

    $scope.getRemoteTracker = function(nodeId){
      nodeId = nodeId.trim();
      log.info("Retrieving tracker for node " + nodeId);

      new RemoteTracker(nodeId, ttnService, function(tracker){
        ttnService.addTracker(tracker);
        $timeout(function(){
          $scope.trackers.push(tracker);
        });
      });

    };

  }])

  .controller('TrackerCtrl', ['$scope', 'ttnService', 'urlRegExp', function($scope, ttnService, urlRegExp) {

    $scope.navigateToThingURL = function(url){
      gui.Shell.openExternal(url);
    };

    $scope.showThings = function(tracker){
      log.info("showing things for tracker with id " + tracker);

      if (tracker === undefined){
        log.error("Unable to show things as no tracker was given.");
        return;
      }

      tracker.mapThingsSummary(function(thingSummary){
        log.info("thingSummary" + thingSummary);
        $scope.thingsSummary.push(thingSummary);
      });

    };

  }])

  .controller('ToolsCtrl', ['$scope', 'ttnService', function($scope, ttnService) {
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

    $scope.followNode = function(nodeId){
      nodeId = nodeId.trim();
      if (nodeId == undefined){
        log.warn("No Node ID given");
        return;
      }
      ttnService.findNode(nodeId);
    };
  }])

  .controller('ThingCtrl', ['$scope', '$location', '$routeParams', 'ttnService',  'urlRegExp', function($scope, $location, $routeParams, ttnService, urlRegExp) {

    var thingId = $routeParams.thingId;
    var trackerId = $routeParams.trackerId;
    var version = $routeParams.version;

    if (!thingId){
      log.error("No Thing ID given.");
      $location.path( "/" );
    };

    $scope.dataPath = ttnService.config.dataPath;

    if (trackerId){

      var tracker = ttnService.getTracker(trackerId);

      if (tracker !== undefined){
        tracker.getThing(thingId, version, function(thing){
            $scope.thing = thing;
        });
      } else {
        log.error("Unable to find tracker with id: " + trackerId);
      }

    } else {
      ttnService.tracker.getThing(thingId, version, function(thing){
          $scope.thing = thing;

          if ($scope.thing == undefined){
            log.error("Unable to find thing for ID: " + thingId);
            $location.path( "/" );
          }
      });
    };

    $scope.downloadThing = function(){
      if ($scope.thing.downloadUrl != undefined){
        gui.Shell.openItem($scope.thing.downloadUrl);
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