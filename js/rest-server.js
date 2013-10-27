var restify = require('restify');

var RestServer = restify.createServer()

RestServer.get('/', function(req,res,next){
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

module.exports = RestServer