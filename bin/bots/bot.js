//
// Bot
//
var Node = require("../../js/ttn-node");
var SHA1 = require('kadoh/lib/util/crypto').digest.SHA1;
var logging = require('kadoh/lib/logging');
var ConsoleLogger = require('kadoh/lib/logger/reporter/color-console')

new ConsoleLogger(logging, 'info');

var Bot = exports.Bot = function(options) {
  options = this._options = options || {
    node       : {},
    delay      : undefined,
    name       : 'bot',
    activity   : false,
    values     : 10
  };
  options.node.reactor = options.node.reactor || {};
  options.node.reactor.transport = options.node.reactor.transport || {};
  options.node.reactor.transport.reconnect = true;
  this.kadoh = new Node(null, options.node);
};

Bot.prototype.start = function() {
  setTimeout(function(self) {
    console.log(self._options.name + ' connecting');
    self.connect();
  }, this._options.delay || 1, this);
};

Bot.prototype.connect = function() {
  var self = this;
  this.kadoh.connect(function() {
    self.join();
    if (self.reporter)
      self.reporter.start();
  });
};

Bot.prototype.join = function() {
  var self = this;
  console.log(self._options.name + ' joining');
  this.kadoh.join(function(error) {
    console.log(self._options.name + ' joined', self.kadoh._routingTable.howManyPeers());
    if (self._options.activity) {
      self.randomActivity();
    }
  });
};

Bot.prototype.randomActivity = function() {
  var timeout = Math.floor((-Math.log(Math.random()) / this._options.activity * 60000));
  var self = this;
  setTimeout(function() {
    var random = Math.floor(Math.random() * 2);
    var value  = String(Math.floor(Math.random() * self._options.values));
    switch(random) {
      case 0:
        self.kadoh.get(SHA1(value), function(){});
        break;
      case 1:
        self.kadoh.put(null, value);
        break;
    }
    self.randomActivity();
  }, timeout);
};