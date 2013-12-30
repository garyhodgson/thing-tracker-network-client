

angular.module('TTNClientApp.controllers').controller('NewTrackerCtrl', ['$scope', '$location', '$routeParams', 'ttnService', function($scope, $location, $routeParams, ttnService) {

  $scope.trackerScopeOptions = [
    'Private','Public'
  ]

  $scope.newTracker = {
    title: '',
    description: '',
    scope: 'Public'
  };

  $scope.createTracker = function(){
    ttnService.createNewTracker(this.newTracker);
  }
}])
