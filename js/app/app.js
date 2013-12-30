var gui = require('nw.gui'),
    log = require('kadoh/lib/logging').ns('TTNClient');

var EventEmitter = require('events').EventEmitter;

var app = angular.module('TTNClientApp', [
    'ngSanitize',
    'ngRoute',
    'timeRelative',
    'ui.bootstrap',
    'xeditable',
    'TTNClientApp.filters',
    'TTNClientApp.services',
    'TTNClientApp.controllers'
  ])

  .config(function($routeProvider, $locationProvider){

    global.eventbus = global.eventbus || new EventEmitter();

    $routeProvider.when('/', {
      templateUrl: 'views/tracker.html',
      controller: 'NodeCtrl'
    });

    $routeProvider.when('/app/tracker/new', {
      templateUrl: 'views/tracker/new.html',
      controller: 'NewTrackerCtrl'
    });

    $routeProvider.when('/app/tracker/:trackerId/thing/new', {
      templateUrl: 'views/thing/new.html',
      controller: 'NewThingCtrl'
    });

    $routeProvider.when('/tracker/:trackerId/thing/:thingId', {
      templateUrl: 'views/thing.html',
      controller: 'ThingCtrl'
    });

    $routeProvider.when('/thing/:thingId', {
      templateUrl: 'views/thing.html',
      controller: 'ThingCtrl'
    });


    $routeProvider.when('/thing/:thingId/:version', {
      templateUrl: 'views/thing.html',
      controller: 'ThingCtrl'
    });

    $routeProvider.when('/settings', {
      templateUrl: 'views/settings.html'
    });

    $routeProvider.when('/tools', {
      templateUrl: 'views/tools.html',
      controller: 'ToolsCtrl'
    });

    $routeProvider.when('/log', {
      templateUrl: 'views/log.html'
    });

    $locationProvider.html5Mode(false);

  })

  .run(function(editableOptions){

    editableOptions.theme = 'bs2';

    var win = gui.Window.get();
    tray = new gui.Tray({ title: 'TTN-Client', icon: 'img/trayicon.png', tooltip: 'TTN-Client' });

    onload = function() {
      win.show();
    }

    var menu = new gui.Menu();

    menu.append(new gui.MenuItem({
      label: 'quit',
      click: function() {
        alertify.confirm("Confirm Quit", function (e) {
            if (e) {
              gui.App.closeAllWindows();
            }
        });
      }
    }));

    menu.append(new gui.MenuItem({
      label: 'show',
      click: function() {
        win.show();
      }
    }));

    tray.menu = menu;

    win.on('minimize', function() {
      win.hide();
    });

    tray.on('click', function() {
      win.show();
    });

  });