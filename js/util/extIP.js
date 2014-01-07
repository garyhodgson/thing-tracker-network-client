var http = require('http');

// Look up external IP Address
// via: https://gist.github.com/cjwfuller/5524942
module.exports.getIP = function(cb) {
  var ipAddr = '';

  http.get("http://jsonip.com", function(res) {
    res.setEncoding('utf8');
    // Make sure we get all the data from the response
    res.on('data', function (chunk) {
        ipAddr += chunk;
    });
    // Response has finished so callback, null is because we  should
    // indicate there was no error
    res.on('end', function() {
        cb(null, JSON.parse(ipAddr).ip);
    });
  }).on('error', function(e) {
    cb(e.message);
  });
};