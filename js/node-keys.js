var Class = require('jsclass/src/core').Class,
    EventEmitter = require('events').EventEmitter,
    keypair = require('keypair'),
    fs = require("fs"),
    Crypto = require("crypto");

var NodeKeys = module.exports = new Class(EventEmitter, {

  events: {
    initialized: "initialized"
  },

  initialize: function(keysLocation) {
    if (keysLocation === undefined) throw Error("No keys location given");
    if (!fs.existsSync(keysLocation)) throw new Error('Non-existant keys location');
    var that = this;


    var pairFilename = keysLocation + "/pair.json"
    var pair

    if (!fs.existsSync(pairFilename)){

      console.warn("Generating Keys");

      pair = keypair();

      var shasum = Crypto.createHash('sha1');
      shasum.update(pair.public);
      pair.public_hash = shasum.digest('hex');

      fs.writeFileSync(pairFilename, JSON.stringify(pair, null, 4));

    } else {
      pair = JSON.parse(fs.readFileSync(pairFilename))
    }

    this._publicKey = pair.public;
    this._privateKey = pair.private;
    this._publicKeyHash = pair.public_hash;

    process.nextTick(function() { that.emit(that.events.initialized) });
  },

  getPublicKeyHash: function(){
    return this._publicKeyHash;
  },

  getPublicKey: function(){
    return this._publicKey;
  },

  sign: function(message){
    var sign = Crypto.createSign('RSA-SHA256');
    sign.update(message);
    return sign.sign(this._privateKey, 'hex');
  },

  verify: function(message, signature, publicKey){
    var verifier = Crypto.createVerify('RSA-SHA256');
    verifier.update(message);
    return verifier.verify(publicKey, signature, 'hex');
  }

});