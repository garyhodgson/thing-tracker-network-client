var restify = require('restify');

var restServer = restify.createServer()

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

module.exports = restServer