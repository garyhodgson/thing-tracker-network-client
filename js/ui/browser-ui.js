var Class = require('jsclass/src/core').Class

var BrowserUI = module.exports = new Class({

  initialize: function(config) {
    if (config.$ === undefined){
      throw Error("browser-ui requires Jquery reference.")
    }

    BrowserUI._$ = config.$;
  },

  log: {
    info: function(){
      console.log.apply(this, arguments);
    },

    debug: function(){
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
  }

})