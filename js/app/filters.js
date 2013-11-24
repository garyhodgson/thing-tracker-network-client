
angular.module('TTNClientApp.filters', [])
  .filter('reverse', function() {
    return function(items) {
      return items.slice().reverse();
    };
  })
  .filter('nl2br', function () {
    return function(text){
      if (text == undefined){
        return undefined;
      }
      return text.replace(/\\n/g,'<br>');
    }
  })
  .filter('stripUrlProtocol', function () {
    return function(text){
        return text.replace(/^(?:(ht|f)tp(s?)\:\/\/)?/,'');
    }
  })
  .filter('truncate', function () {
    return function (text, length, end) {
        if (isNaN(length))
            length = 10;

        if (end === undefined)
            end = "...";

        if (text.length <= length || text.length - end.length <= length) {
            return text;
        }
        else {
            return String(text).substring(0, length-end.length) + end;
        }

    };
});