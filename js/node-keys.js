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

  initialize: function(publicKeyFile, privateKeyFile, pemCertificateFile) {

    if (fs.existsSync(publicKeyFile) && !fs.existsSync(privateKeyFile)) throw Error("publicKeyFile exists but privateKeyFile is missing: "+publicKeyFile + "," + privateKeyFile);
    if (!fs.existsSync(publicKeyFile) && fs.existsSync(privateKeyFile)) throw Error("privateKeyFile exists but publicKeyFile is missing: "+privateKeyFile + "," + publicKeyFile);

    var that = this;
    this.isPersistentKey = (publicKeyFile !== undefined && privateKeyFile !== undefined);

    if (!this.isPersistentKey){
      log.warn("No key files given, using random data to seed one-time hash.");
      this._privateKey = Crypto.randomBytes(256);
      this._publicKey = Crypto.randomBytes(256);

    } else if (!fs.existsSync(publicKeyFile) && !fs.existsSync(privateKeyFile)){

      log.warn("Generating Keys");
      eventbus.emit(eventbus.generatingKeys);

      var pair = keypair();

      this._privateKey = pair.private;
      this._publicKey = pair.public;

      if (pemCertificateFile && !fs.existsSync(pemCertificateFile)){
        pem.createCertificate({serviceKey: this._privateKey}, function(err, result){
          if (err) return log.error("Error creating PEM Certificate: " + err);
          this._certificate = result.certificate;
          fs.writeFileSync(pemCertificateFile, this._certificate);
        });
      }

      fs.writeFileSync(publicKeyFile, pair.public);
      fs.writeFileSync(privateKeyFile, pair.private);

    } else {
      this._publicKey = fs.readFileSync(publicKeyFile);
      this._privateKey = fs.readFileSync(privateKeyFile);
      if (pemCertificateFile && !fs.existsSync(pemCertificateFile)){
        this._certificate = fs.readFileSync(pemCertificateFile);
      }
    }

    var shasum = Crypto.createHash('sha1');
    shasum.update(this._publicKey);
    this._publicKeyHash = shasum.digest('hex');

    if (this.isPersistentKey){
      this._signature = this.sign(JSON.stringify({
        nodeId : this.getPublicKeyHash(),
        publicKey : this.getPublicKey()
      }));
    } else {
      this._signature = "";
    }

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