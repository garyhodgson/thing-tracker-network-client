var fs = require('fs'),
    gui = require('nw.gui'),
    TTNService = require('./js/ttn-service'),
    nconf = require('nconf');


angular.module('TTNClientApp.services', [])

  .factory('argv', function(){
    return require('optimist').parse(gui.App.argv);
  })

  .factory('ttnConfig', ['argv', function(argv){
    if (argv.c){
      nconf.file({ file: argv.c });
    }

    if (fs.existsSync(gui.App.dataPath + '/ttn-config.json')){
      nconf.file({ file: gui.App.dataPath + '/ttn-config.json' })
    }

    nconf.defaults({
      "dht": {  "bootstraps" : [argv.b||'127.0.0.1:3001'],
                "port": parseInt(argv.port, 10) || 9880},
      "RESTServer" : { "port": parseInt(argv.restPort, 10) || 9880 },
      "startup" : { "joinDHT" : "true",
                    "startRESTServer" : "true"},
      "transient" : argv.transient?"true":"false",
      "dataPath": argv.d || './data'
    });

    return nconf.load();
  }])

  .factory('ttnService', ['ttnConfig', function(ttnConfig){
    return new TTNService(ttnConfig);
  }])