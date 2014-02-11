
angular.module('TTNClientApp.directives', [])
.directive('triStateIndicator', function() {
    return {
      scope: {
        state: '=state'
      },
      template: '<i ng-class="{undefined: \'glyphicon glyphicon-question-sign blue\', true: \'glyphicon glyphicon-ok-sign green\', false: \'glyphicon glyphicon-remove-sign red\'}[state]"></i>'
    };
  });