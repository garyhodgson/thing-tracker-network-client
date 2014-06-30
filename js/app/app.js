var gui = require('nw.gui'),
    eventbus = require('./js/event-bus'),
    fs = require('fs-extra'),
    EventEmitter = require('events').EventEmitter,
    log = require('kadoh/lib/logging').ns('TTNClient');

var app = angular.module('TTNClientApp', [
    'ngSanitize',
    'ngRoute',
    'timeRelative',
    'ui.bootstrap',
    'TTNClientApp.directives',
    'TTNClientApp.filters',
    'TTNClientApp.services',
    'TTNClientApp.controllers'
  ])
  .config(function($routeProvider, $locationProvider){

    global.eventbus = global.eventbus || new EventEmitter();

    $routeProvider.when('/', {
      templateUrl: 'views/main.html',
      controller: 'NodeCtrl'
    });

    $routeProvider.when('/app/tracker/new', {
      templateUrl: 'views/tracker/new.html',
      controller: 'NewTrackerCtrl'
    });

    $routeProvider.when('/app/tracker/:trackerId/thing/new', {
      templateUrl: 'views/thing/edit.html',
      controller: 'NewThingCtrl'
    });

    $routeProvider.when('/app/tracker/:trackerId/thing/:thingId/edit', {
      templateUrl: 'views/thing/edit.html',
      controller: 'NewThingCtrl'
    });

    $routeProvider.when('/tracker/:trackerId/thing/:thingId', {
      templateUrl: 'views/thing/view.html',
      controller: 'ThingCtrl'
    });

    $routeProvider.when('/thing/:thingId', {
      templateUrl: 'views/thing/view.html',
      controller: 'ThingCtrl'
    });


    $routeProvider.when('/thing/:thingId/:version', {
      templateUrl: 'views/thing/view.html',
      controller: 'ThingCtrl'
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

  .run(function(){

    var splashwin;

    eventbus.on(eventbus.generatingKeys, function(){

      if (splashwin !== undefined){
        return;
      }

      var splashHtml = process.cwd() + "/generatingKeys.html";

      if (fs.existsSync(splashHtml)){
        splashwin = gui.Window.open('file://' + splashHtml, {
            'frame': false,
            "toolbar": false,
            "new-instance": true,
            'position': 'center',
            'always-on-top': true
        });
      } else {
        console.log("Unable to find splash html at " + splashHtml);
      }

    });

    var win = gui.Window.get();
    tray = new gui.Tray({ title: 'TTN-Client', icon: 'img/trayicon.png', tooltip: 'TTN-Client' });

    onload = function() {
      if (splashwin) splashwin.close(true);
      win.show();
    }

    var menu = new gui.Menu();

    menu.append(new gui.MenuItem({
      label: 'quit',
      click: function() {
        win.close();
      }
    }));

    menu.append(new gui.MenuItem({
      label: 'show',
      click: function() {
        win.show();
        win.focus();
      }
    }));

    menu.append(new gui.MenuItem({
      label: 'hide',
      click: function() {
        win.hide();
      }
    }));

    win.on('close', function() {
      var that = this;
      console.log("close");

      eventbus.emit(eventbus.events.app.closeRequest, function(){
        that.close(true);
      });
    });

    tray.menu = menu;

    win.on('minimize', function() {
      win.hide();
    });

    tray.on('click', function() {
      win.show();
      win.focus();
    });

  });