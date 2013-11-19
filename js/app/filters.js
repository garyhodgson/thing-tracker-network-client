
angular.module('TTNClientApp.filters', [])
  .filter('reverse', function() {
    return function(items) {
      return items.slice().reverse();
    };
  })
  .filter('nl2br', function () {
    return function(text){
        return text.replace(/\\n/g,'<br>');
    }
  });