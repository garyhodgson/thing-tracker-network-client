var Class = require('jsclass/src/core').Class,
    EventEmitter = require('events').EventEmitter,
    keypair = require('keypair'),
    fs = require("fs-extra"),
    Crypto = require("crypto"),
    pem = require('pem'),
    eventbus = require('./event-bus'),
    log = require('kadoh/lib/logging').ns('NodeKeys');

var NodeKeys = module.exports = new Class(EventEmitter, {

  events: {
    initialized: "initialized"
  },

  initialize: function(keysLocation, nodeId) {
    if (keysLocation === undefined) throw Error("No keys location given");
    if (!fs.existsSync(keysLocation)) throw new Error('Non-existant keys location: ' + keysLocation);
    var that = this;


    var pairFilename = keysLocation + "/keys.json"
    var pair

    if (!fs.existsSync(pairFilename)){

      log.warn("Generating Keys");
      eventbus.emit(eventbus.generatingKeys);

      pair = keypair();

      var shasum = Crypto.createHash('sha1');
      shasum.update(pair.public);
      pair.publicHash = shasum.digest('hex');

      pem.createCertificate({serviceKey: pair.private}, function(err, result){
        if (err) throw err;
        pair.certificate = result.certificate;
      });

      fs.writeFileSync(pairFilename, JSON.stringify(pair, null, 4));

    } else {
      pair = JSON.parse(fs.readFileSync(pairFilename))
    }

    this._publicKey = pair.public;
    this._privateKey = pair.private;
    this._publicKeyHash = pair.publicHash;
    this._certificate = pair.certificate;
    this._signature = this.sign(JSON.stringify({
      nodeId : this.getPublicKeyHash(),
      publicKey : this.getPublicKey()
    }));

    process.nextTick(function() { that.emit(that.events.initialized) });

  },

  getPublicKeyHash: function(){
    return this._publicKeyHash;
  },

  getPublicKey: function(){
    return this._publicKey;
  },

  getCertificate: function(){
    return this._certificate;
  },

  getPrivateKey: function(){
    return this._privateKey;
  },

  getSignature: function(){
    return this._signature;
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