
angular.module('TTNClientApp.controllers').controller('ToolsCtrl', ['$scope', 'ttnNode', function($scope, ttnNode) {

  $scope.nodes = [];

  $scope.refreshInfo = function(){
    ttnNode.stats();
  };

  $scope.findNode = function(nodeId){
    if (nodeId == undefined){
      log.warn("No Node ID given");
      return;
    }
    ttnNode.findNodeAsync(nodeId, false, function(node){

      $scope.nodes.push(node);

    });
  };

}])