var Class = require('jsclass/src/core').Class,
    EventEmitter = require('events').EventEmitter,
    restify = require('restify');


var RestServerFactory = module.exports = new Class(EventEmitter, {

  events: {
    initialized: 'initialized'
  },

  instance: function(nodeKeys, protocol){

    var config = {name: "TTNClient:transient"};

    if (nodeKeys !== undefined && protocol == "https"){
      config.name = "TTNClient:" + nodeKeys.getPublicKeyHash();
      config.certificate = nodeKeys.getCertificate();
      config.key = nodeKeys.getPrivateKey();
    }

    var restServer = restify.createServer(config)

    restServer.use(restify.acceptParser(restServer.acceptable));
    restServer.use(restify.jsonp());

    restServer.get('/', function(req,res,next){
      res.send([{
        uri:"/node",
        description:"Information about this node"
      },
      {
        uri:"/tracker",
        description:"Thing tracker"
      }]);
      return next();
    });

    return restServer;
  },

  initialize: function() {
  }

});
