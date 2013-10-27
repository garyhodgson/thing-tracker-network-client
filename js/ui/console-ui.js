var Class = require('jsclass/src/core').Class

var ConsoleUI = module.exports = new Class({

  initialize: function() {
  },

  log: function(){
    console.log.apply(this, arguments);
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