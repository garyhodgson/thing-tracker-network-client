
angular.module('TTNClientApp.controllers').controller('ToolsCtrl', ['$scope', 'ttnNode', function($scope, ttnNode) {

  $scope.nodes = [];

  $scope.put = function(){
    ttnNode.dhtNode.put(null, toolsForm.putValue.value, null, function(v){
      log.info(v)
    })
  };

  $scope.get = function(){
    ttnNode.dhtNode.get(toolsForm.getValue.value, function(v){
      log.info(v)
    })
  };

  $scope.refreshInfo = function(){
    ttnNode.stats();
  };

  $scope.followNode = function(nodeId){
    nodeId = nodeId.trim();
    if (nodeId == undefined){
      log.warn("No Node ID given");
      return;
    }
    ttnNode.findNodeAsync(nodeId, function(node){

      $scope.nodes.push(node);

      ttnNode.dhtService._node.getTracker(node._address, node._id, function(tracker){
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
    ttnNode.findNodeByAddressAsync(nodeAddress, function(node){
      $scope.nodes.push(node);
      ttnNode.dhtService._node.getTracker(node._address, node._id, function(tracker){
        console.log(tracker);
      })
    });
  };

}])