

angular.module('TTNClientApp.controllers').controller('NewTrackerCtrl', ['$scope', '$location', '$routeParams', 'ttnNode', function($scope, $location, $routeParams, ttnNode) {

  $scope.trackerScopeOptions = [
    'Private','Public'
  ]

  $scope.newTracker = {
    title: '',
    description: '',
    scope: 'Public'
  };

  $scope.createTracker = function(){
    ttnNode.createNewTracker(this.newTracker);
  }
}])
