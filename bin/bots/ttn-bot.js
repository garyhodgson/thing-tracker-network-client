//
// TTN Bot
//
var TTNNode = require("../../js/ttn-node");
var logging = require('kadoh/lib/logging');
var ConsoleLogger = require('kadoh/lib/logger/reporter/color-console')

log = logging.ns('TTNBOT');

var TTNBot = exports.TTNBot = function(options) {

  new ConsoleLogger(logging, options.loglevel||'info');

  this.node = new TTNNode(options);
};

TTNBot.prototype.start = function() {
  setTimeout(function(self) {
    log.info(self._options.name + ' connecting');
    self.connect();
  }, this._options.delay || 1, this);
};

TTNBot.prototype.connect = function() {
  var self = this;
  this.node.connect(function() {
    self.join();
    if (self.reporter)
      self.reporter.start();
  });
};

TTNBot.prototype.join = function() {
  var self = this;
  log.info(self._options.name + ' joining');
  this.node.join(function(error) {
    log.info(self._options.name + ' joined. Peers: ', self.node._routingTable.howManyPeers());
    if (self._options.activity) {
      self.randomActivity();
    }
  });
};
