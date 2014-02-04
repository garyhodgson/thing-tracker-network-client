
var ConsoleLogger = require('kadoh/lib/logger/reporter/color-console')
var logging = require('kadoh/lib/logging');

new ConsoleLogger(logging, 'info');

var spawn = require('child_process').spawn;
var TTNNode = require("../../js/ttn-node");

var Pool = module.exports = function(size) {
  this._size       = size;
  this._launched   = false;
  this._nodes      = [];
};

Pool.prototype.start = function() {
  if (!this._launched) {
    for (n = 0; n < this._size; n++) {

      var portNumber = 10100 + parseInt(n, 10);
      this._nodes.push(new TTNNode({
        "nodeName":"bot" + n,
        "dht": {
          "bootstraps" : ['127.0.0.1:3001'],
          "port": portNumber
        },
        "RESTServer" : {
          "port": portNumber,
        },
        "startup" : {
          "joinDHT" : "true",
          "startRESTServer" : "true"
        },
        "dataPath": "botpool/bot" + n
      }));
    }
    this._launched = true;
  }
};