var fs = require('fs'),
    gui = require('nw.gui'),
    TTNNode = require('./js/ttn-node'),
    nconf = require('nconf');


angular.module('TTNClientApp.services', [])

  .value('urlRegExp',
    new RegExp(/^(?!mailto:)(?:(?:https?|ftp):\/\/)?(?:\S+(?::\S*)?@)?(?:(?:(?:[1-9]\d?|1\d\d|2[01]\d|22[0-3])(?:\.(?:1?\d{1,2}|2[0-4]\d|25[0-5])){2}(?:\.(?:[0-9]\d?|1\d\d|2[0-4]\d|25[0-4]))|(?:(?:[a-z\u00a1-\uffff0-9]+-?)*[a-z\u00a1-\uffff0-9]+)(?:\.(?:[a-z\u00a1-\uffff0-9]+-?)*[a-z\u00a1-\uffff0-9]+)*(?:\.(?:[a-z\u00a1-\uffff]{2,})))|localhost)(?::\d{2,5})?(?:\/[^\s]*)?$/i)
  )

  .factory('argv', function(){
    return require('optimist').parse(gui.App.argv);
  })

  .factory('ttnConfig', ['argv', function(argv){
    if (argv.c){
      console.log("loading config from " + argv.c);
      nconf.file({ file: argv.c });
    }

    if (fs.existsSync(gui.App.dataPath + '/ttn-config.json')){
      console.log("loading config from " + gui.App.dataPath + '/ttn-config.json');
      nconf.file({ file: gui.App.dataPath + '/ttn-config.json' })
    }

    nconf.defaults({
      "dht": {  "bootstraps" : [argv.b||'127.0.0.1:3001'],
                "port": parseInt(argv.port, 10) || 9880},
      "RESTServer" : { "port": parseInt(argv.restPort, 10) || 9880 },
      "startup" : { "joinDHT" : "true",
                    "startRESTServer" : "true"},
      "dataPath": argv.d || './data'
    });

    return nconf.load();
  }])

  .factory('ttnNode', ['ttnConfig', function(ttnConfig){
    return new TTNNode(ttnConfig);
  }])