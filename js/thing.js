var Class = require('jsclass/src/core').Class,
    _ = require('lodash'),
    fs = require("fs"),
    log = require('kadoh/lib/logging').ns('Thing'),
    path = require("path");

var Thing = module.exports = new Class({

  initialize: function(attributes, callback) {
    var that = this;

    if (callback){
      callback(that);
    }
  },

});