
angular.module('TTNClientApp.controllers').controller('ToolsCtrl', ['$scope', 'ttnService', function($scope, ttnService) {

  $scope.nodes = [];

  $scope.put = function(){
    ttnService.dhtNode.put(null, toolsForm.putValue.value, null, function(v){
      log.info(v)
    })
  };

  $scope.get = function(){
    ttnService.dhtNode.get(toolsForm.getValue.value, function(v){
      log.info(v)
    })
  };

  $scope.refreshInfo = function(){
    ttnService.stats();
  };

  $scope.followNode = function(nodeId){
    nodeId = nodeId.trim();
    if (nodeId == undefined){
      log.warn("No Node ID given");
      return;
    }
    ttnService.findNodeAsync(nodeId, function(node){

      $scope.nodes.push(node);

      ttnService.dhtService._node.getTracker(node._address, node._id, function(tracker){
        console.log(tracker);
      })

    });
  };

  $scope.followNodeFromAddress = function(nodeAddress){
    nodeAddress = nodeAddress.trim();
    if (nodeAddress == undefined){
      log.warn("No Node Address given");
      return;
    }
    ttnService.findNodeByAddressAsync(nodeAddress, function(node){
      $scope.nodes.push(node);
      ttnService.dhtService._node.getTracker(node._address, node._id, function(tracker){
        console.log(tracker);
      })
    });
  };

}])