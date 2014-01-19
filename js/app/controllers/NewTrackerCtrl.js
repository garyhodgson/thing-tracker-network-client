

angular.module('TTNClientApp.controllers').controller('NewTrackerCtrl', ['$scope', '$location', '$routeParams', 'ttnNode', function($scope, $location, $routeParams, ttnNode) {

  $scope.newTracker = {
    title: '',
    description: ''
  };

  $scope.createTracker = function(){
    ttnNode.createNewTracker(this.newTracker, function(err, tracker){
      if (err){
        return log.error(err);
      }

      log.info("New Tracker created: " + tracker.id)
      $location.path( "/" );
    });
  }
}])
