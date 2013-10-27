var Class = require('jsclass/src/core').Class

var BrowserUI = module.exports = new Class({

  initialize: function() {
  },

  log: function(){
    console.log(arguments);
  },

  success: function(){
    console.log.apply(this, arguments);
  },

  warn: function(){
    console.warn.apply(this, arguments);
  },

  error: function(){
    console.error.apply(this, arguments);
  }

})