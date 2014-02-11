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

  process.on('uncaughtException', function(err) {
    if (log){
      log.error('UncaughtException', err.message, err);
    }
    if (console){
      console.log('UncaughtException', err.message, err);
    //console.log('Shutting down TTN Node');
    }
    // tmp turn off
    /*if (ttnNode){
      ttnNode.shutdown(function(){
        if (console){
          console.log('TTN Node shutdown.');
        }
      });
    }*/
  });

  eventbus.on(eventbus.events.warning, function(message){
    log.warn(message);
  })
  .on(eventbus.events.info, function(message){
    log.info(message);
  })
  .on(eventbus.events.error, function(message){
    log.error(message);
  });

  eventbus.on(eventbus.events.app.closeRequest, function(callback){
    alertify.confirm("Confirm Quit", function (e) {
      if (e) {
        ttnNode.shutdown(callback);
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

  $scope.navigateToURL = function(url){

    if (/^mailto:/.test(url)){
      gui.Shell.openExternal(url);
    } else if (urlRegExp.test(url)) {

      if (! /^http/.test(url)){
        url = "http://"+url;
      }

      gui.Shell.openExternal(url);

    } else {
      log.warn("Unable to navigate to url: " + url);
    }
  };

  $scope.imagePath = function(itemLocation){
    if (itemLocation === undefined){
      return "";
    }

    if (urlRegExp.test(itemLocation)){
      return itemLocation;
    } else {
      var fileLocation = $scope.dataPath+itemLocation;
      if (fs.existsSync(fileLocation)){
        return fileLocation
      } else {
        return "img/404.png";
      }
    }
  };

}]);