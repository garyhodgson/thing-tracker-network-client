var keypair = require('keypair');
var fs = require("fs");
var crypto = require("kadoh/lib/util/crypto");
var crypto2 = require("crypto");

var keyLocation = global.execPath||'.'

console.log("Looking for keys in : " + keyLocation+ "/data")

if (! fs.existsSync(keyLocation + "/data")){
	keyLocation = "."

	console.log("Looking for keys in : " + keyLocation+ "/data")
	if (! fs.existsSync(keyLocation + "/data")){
		throw new Error('unable to find data directory.')
	}
}

var pairFilename = keyLocation + "/data/pair.json"
var pair


if (!fs.existsSync(pairFilename)){

	pair = keypair();

	pair.public_hash = crypto.digest.SHA1(pair.public)

	console.log("Writing new key to " + keyLocation+ "/data");

  	fs.writeFileSync(pairFilename, JSON.stringify(pair, null, 4));

} else {

	var d = fs.readFileSync(pairFilename)
	pair = JSON.parse(d)
}

//example of using crypto module
/*var sign = crypto2.createSign('RSA-SHA256')

sign.update(pair.public_hash)

var public_hash_signature = sign.sign(pair.private, 'hex')

console.log(public_hash_signature);

var verifier = crypto2.createVerify('RSA-SHA256')

verifier.update(pair.public_hash)

var verified = verifier.verify(pair.public, public_hash_signature, 'hex')

console.log(verified?"verified":"not verified");*/


exports.keys = pair;