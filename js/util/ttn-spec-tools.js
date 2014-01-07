var _ = require("lodash");

var mapping = {
  "uuid":"id",
  "ref-url":"refURL",
  "thumbnail-urls":"thumbnails",
  "image-urls":"images",
  "thumbnail-url":"thumbnail"
}

module.exports.renameKey = function renameKey(obj, oldKey, newKey){
  if (obj.hasOwnProperty(oldKey) && !obj.hasOwnProperty(newKey)){
    obj[newKey] = obj[oldKey];
    delete obj[oldKey];
  }
  return obj;
}

module.exports.fixKeys = function fixKeys(src){

  if (_.isPlainObject(src)){

    var dst = {};

    _.each(src, function( value, key ) {
      var newKey;
      if (mapping && mapping[key]){
        newKey = mapping[key];
        module.exports.renameKey(src, key, newKey);
      } else {
        newKey = key.replace(/([ -]+)([a-zA-Z0-9])/g, function(a,b,c) { return c.toUpperCase(); });
      }
      dst[newKey] = fixKeys(value);
    });

    return dst;

  } else if (_.isArray(src)){

    return _.map(src, function(item, index){ return fixKeys(item); });

  } else {

    return src;

  }
}