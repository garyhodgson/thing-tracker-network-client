var keypair = require('keypair');
var fs = require("fs");
var crypto = require("kadoh/lib/util/crypto");
var crypto2 = require("crypto");

var keyLocation;

if (global.dataPath){
	keyLocation = global.dataPath;
} else if (global.execPath){
	keyLocation = global.execPath + '/data';
} else {
	keyLocation = './data'
}

console.log("Looking for keys in : " + keyLocation)

if (! fs.existsSync(keyLocation)){
	throw new Error('unable to find key location.')
}


var pairFilename = keyLocation + "/pair.json"
var pair

if (!fs.existsSync(pairFilename)){

	pair = keypair();

	pair.public_hash = crypto.digest.SHA1(pair.public)

	console.log("Writing new key to " + keyLocation);

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