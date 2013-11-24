var gui = require('nw.gui'),
    log = require('kadoh/lib/logging').ns('TTNClient');

var EventEmitter = require('events').EventEmitter;

var app = angular.module('TTNClientApp', [
    'ngSanitize',
    'ngRoute',
    'timeRelative',
    'ui.bootstrap',
    'TTNClientApp.filters',
    'TTNClientApp.services',
    'TTNClientApp.controllers'
  ])

  .config(function($routeProvider, $locationProvider){

    global.eventbus = global.eventbus || new EventEmitter();

    $routeProvider.when('/', {
      templateUrl: 'views/tracker.html'
    });

    $routeProvider.when('/thing/:id', {
      templateUrl: 'views/thing.html',
      controller: 'ThingCtrl'
    });

    $routeProvider.when('/thing/:id/:version', {
      templateUrl: 'views/thing.html',
      controller: 'ThingCtrl'
    });

    $routeProvider.when('/settings', {
      templateUrl: 'views/settings.html'
    });

    $routeProvider.when('/tools', {
      templateUrl: 'views/tools.html'
    });

    $routeProvider.when('/log', {
      templateUrl: 'views/log.html'
    });

    $locationProvider.html5Mode(false);

  })

  .run(function(){

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

    tray.menu = menu;

    win.on('minimize', function() {
      win.hide();
    });

    tray.on('click', function() {
      win.show();
    });

  });