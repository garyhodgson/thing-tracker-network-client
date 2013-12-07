var logging = require('kadoh/lib/logging'),
    AngularConsole = require('./js/ui/angular-console'),
    eventbus = require('./js/event-bus'),
    gui = require('nw.gui'),
    fs = require('fs'),
    _ = require('underscore'),
    RemoteTracker = require('./js/remote-tracker');

_.templateSettings = { interpolate: /\{\{(.+?)\}\}/g };


angular.module('TTNClientApp.controllers', [])
.controller('AppCtrl', ['$scope', '$timeout', '$sanitize', 'ttnService','argv', 'urlRegExp', function($scope, $timeout, $sanitize, ttnService, argv, urlRegExp) {
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
      log.debug("ttnService.events.initialized")
      var nodeId = trackerService.getRootTracker().id;
      $scope.trackers[nodeId] = trackerService.getRootTracker();
      trackerService.getRootTracker().mapThingsSummary(function(thingSummary){
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
      trackerService.getRemoteTrackerAsync(nodeId, ttnService.dhtService, function(tracker){
        $timeout(function(){
          $scope.trackers[nodeId] = tracker;
        });
      });
    };

  }])

.controller('NodeCtrl', ['$scope', '$timeout', 'ttnService', function($scope, $timeout, ttnService) {

  var trackerService = ttnService.trackerService;

  $scope.getNode = function(nodeId){
    nodeId = nodeId.trim();
    trackerService.getRemoteTrackerAsync(nodeId, ttnService.dhtService, function(tracker){
      $timeout(function(){
        $scope.trackers[nodeId] = tracker;
      });
    });
  };

  $scope.removeNode = function(nodeId){
    nodeId = nodeId.trim();
    trackerService.removeRemoteTrackerAsync(nodeId, function(err){
      if (err) {
        log.error(err);
        return;
      }

      $timeout(function(){
        delete $scope.trackers[nodeId];
      });
    });
  };



}])

.controller('TrackerCtrl', ['$scope', '$timeout', 'ttnService', function($scope, $timeout, ttnService) {

    var trackerService = ttnService.trackerService;



    $scope.navigateToThingURL = function(url){
      gui.Shell.openExternal(url);
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

}])

.controller('ToolsCtrl', ['$scope', 'ttnService', function($scope, ttnService) {
    $scope.put = function(){
      ttnService.dhtNode.put(null, toolsForm.putValue.value, null, function(v){
        log.info(v)
      })
    };

    $scope.get = function(){
      ttnService.dhtNode.get(toolsForm.getValue.value, function(v){
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
      ttnService.findNodeAsync(nodeId, function(node){

        ttnService.dhtService._node.getTracker(node._address, node._id, function(tracker){
          console.log(tracker);
        })

      });
    };

}])

.controller('ThingCtrl', ['$scope', '$location', '$routeParams', 'ttnService',  'urlRegExp', function($scope, $location, $routeParams, ttnService, urlRegExp) {

    var thingId = $routeParams.thingId;
    var trackerId = $routeParams.trackerId;
    var version = $routeParams.version;
    var trackerService = ttnService.trackerService;

    if (!thingId){
      log.error("No Thing ID given.");
      $location.path( "/" );
    };

    $scope.dataPath = ttnService.config.dataPath;
    $scope.tracker = (trackerId !== undefined) ? trackerService.getTracker(trackerId) : trackerService.getRootTracker();

    if ($scope.tracker === undefined){
      log.error("Unable to find tracker for thing: " +thingId);
      $location.path( "/" );
    }

    $scope.tracker.getThing(thingId, version, function(thing){
        thing.isCachedLocally = $scope.tracker.isCachedLocally(thing);
        $scope.thing = thing;
    });

    $scope.downloadThing = function(){
      $scope.tracker.downloadThing($scope.thing, function(downloadPath){
        gui.Shell.openItem(downloadPath);
      });
    };

    $scope.openBOMItem = function(itemLocation){
      if (urlRegExp.test(itemLocation)){
        gui.Shell.openItem(itemLocation);
      } else {
        gui.Shell.openItem(fs.realpathSync($scope.dataPath+"/"+itemLocation));
      }
    };

    $scope.showBOMItem = function(itemLocation){
      if (urlRegExp.test(itemLocation)){
        gui.Shell.showItemInFolder(itemLocation);
      } else {
        gui.Shell.showItemInFolder(fs.realpathSync($scope.dataPath+"/"+itemLocation));
      }
    };



  }])
;