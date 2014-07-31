var Class = require('jsclass/src/core').Class,
    EventEmitter = require('events').EventEmitter,
    restify = require('restify'),
    util = require('util'),
    _ = require('lodash');

var RestServerFactory = module.exports = new Class(EventEmitter, {

  events: {
    initialized: 'initialized'
  },

  instance: function(nodeKeys, protocol){

    var config = {name: "TTNClient:" + nodeKeys.getPublicKeyHash()};

    if (protocol == "https"){
      config.certificate = nodeKeys.getCertificate();
      config.key = nodeKeys.getPrivateKey();
    }

    config.formatters = {
      'application/octet-stream': function(req, res, body) {
        if (body instanceof Error){
          return body.stack;
        }
        if (body.downloadUrl){
          res.statusCode = 303;
          res.header('Location', body.downloadUrl);
        }
      },
      'image/*': function(req, res, body) {
        if (body instanceof Error){
          return body.stack;
        }
        if (!body.thumbnailUrls){
          res.statusCode = 406;
        } else {
          res.statusCode = 303;
          res.header('Location', body.thumbnailUrls[0]);
        }
      },
      'text/plain': function(req, res, body) {
        if (body instanceof Error){
          return body.stack;
        }
        if (!body.title && !body.description){
          return util.inspect(body);
        }

        var txt = "";

        if (body.title){
          txt = body.title;
          if (body.description){
            txt += "\n\n" + body.description;
          }
        } else if (body.description){
            txt = body.description;
          }
        return txt;

      },
      'text/html': function(req, res, body) {
        if (body instanceof Error){
          return body.stack;
        }
        if (body.title || body.description){
          return _.template("<h1>${title}</h1><p>${description}</p>", body);
        }

        return util.inspect(body);
      },
      'application/json': function(req, res, body) {
        if (body instanceof Error){
          return body.stack;
        }
        return JSON.stringify(body);
      }
    }

    var restServer = restify.createServer(config)

    restServer.use(restify.acceptParser(restServer.acceptable));
    restServer.use(restify.jsonp());

    return restServer;
  },

  initialize: function() {
  }

});
