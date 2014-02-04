var path = require('path'),
    fs = require('fs-extra'),
    gui = require('nw.gui'),
    TTNNode = require('./js/ttn-node'),
    path = require('path')
    nconf = require('nconf')
    optimist = require('optimist');

angular.module('TTNClientApp.services', [])

.value('urlRegExp',
  new RegExp(/^(?!mailto:)(?:(?:https?|ftp):\/\/)?(?:\S+(?::\S*)?@)?(?:(?:(?:[1-9]\d?|1\d\d|2[01]\d|22[0-3])(?:\.(?:1?\d{1,2}|2[0-4]\d|25[0-5])){2}(?:\.(?:[0-9]\d?|1\d\d|2[0-4]\d|25[0-4]))|(?:(?:[a-z\u00a1-\uffff0-9]+-?)*[a-z\u00a1-\uffff0-9]+)(?:\.(?:[a-z\u00a1-\uffff0-9]+-?)*[a-z\u00a1-\uffff0-9]+)*(?:\.(?:[a-z\u00a1-\uffff]{2,})))|localhost)(?::\d{2,5})?(?:\/[^\s]*)?$/i)
)

.factory('argv', function(){
  return optimist.parse(gui.App.argv);
})

.factory('ttnConfig', ['argv', function(argv){

  var homeDir = process.env.USERPROFILE || process.env.HOME || process.env.HOMEPATH;
  var ttnHomeDir = path.normalize(homeDir + "/.ttn");

  if (argv.c) {
    configLocation = argv.c
  } else {

    if (!fs.existsSync(ttnHomeDir)){
      console.log("No ttn home path given. Creating default in user home directory: " + ttnHomeDir);
      fs.mkdirSync(ttnHomeDir);

      if (!fs.existsSync(ttnHomeDir)){
        console.error("Unable to create ttn home dir: " + ttnHomeDir);
        process.exit(1);
      }
    }
    var configLocation = path.normalize(ttnHomeDir + '/ttn-config.json');

    fs.outputJsonSync(configLocation, {
      "dataPath": ttnHomeDir + '/data'
    });
  }

  if (argv.d){
    nconf.use('memory')
    nconf.set("dataPath", argv.d)
  }

  console.log("loading config from " + configLocation);
  nconf.file({ file: configLocation });

  if (!argv.d){
    var dataDir = nconf.get("dataPath");

    if (!fs.existsSync(dataDir)){
      console.log("No data path given and none found in config so far, creating default in user home directory: " + dataDir);
      fs.mkdirSync(dataDir);

      if (!fs.existsSync(dataDir)){
        console.error("Unable to create data dir: " + dataDir);
        process.exit(1);
      }
    }
  }

  nconf.defaults({
    "dht": {  "bootstraps" : [argv.b||'127.0.0.1:3001'],
              "port": parseInt(argv.port, 10) || 9880},
    "RESTServer" : { "port": parseInt(argv.restPort, 10) || 9880 },
    "startup" : { "joinDHT" : "true",
                  "startRESTServer" : "true"},
    "dataPath": path.normalize(argv.d || ttnHomeDir+'/data')
  });

  console.log(nconf.get("dataPath"));

  return nconf.load();
}])

.service('ttnNode', ['ttnConfig', TTNNode])