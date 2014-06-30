'use strict';

var angular = require('angular');
var directives = require('../scripts/modules').directives;

angular.module(directives.name).directive('dashboard', function (gettextCatalog, $modal, visualization, Dashboard) {
  return {
    restrict: 'E',
    template: require('./dashboard.html'),
    scope: {
      dashboardId: '=?'
    },
    compile: function () {
      return {
        pre: function (scope) {
          scope.gridsterOptions = {
            margins: [10, 10],
            columns: 12,
            draggable: {
              enabled: true
            },
            resizable: {
              enabled: true
            }
          };
          if (scope.dashboardId) {
            Dashboard.get(scope.dashboardId, function (data) {
              scope.dashboard = data._source;
            });
          } else {
            scope.dashboard = {
              name: '',
              widgets: []
            };
          }

          scope.addWidget = function () {
            // TODO we don't need a modal with a single field
            $modal.open({
              template: require('./add-widget.html'),
              controller: ['$scope', '$modalInstance', function ($scope, $modalInstance) {
                visualization.resource.get(function (visualizations) {
                  $scope.visualizations = visualizations.results;
                });
                $scope.widget = {};

                $scope.cancel = function () {
                  $modalInstance.dismiss('cancel');
                };

                $scope.submit = function (form) {
                  // grab name and url
                  if (form.$invalid) {
                    $scope.yellAtUser = true;
                    return;
                  }

                  $modalInstance.close({
                    visualization: $scope.visualizations.filter(function (viz) {
                      return viz._id === $scope.widget.visualization;
                    })[0]._source
                  });
                };
              }]
            }).result.then(function (widget) {
                // create widget with name and visualization
                scope.dashboard.widgets.push({
                  name: widget.visualization.name,
                  sizeX: 3,
                  sizeY: 3,
                  content: widget.visualization
                });
              });
          };

          scope.clear = function () {
            scope.dashboard.widgets = [];
          };

          scope.export = function () {
            if (scope.dashboardId) {
              Dashboard.update(Dashboard.state(scope.dashboard), scope.dashboardId);
            } else {
              Dashboard.save(Dashboard.state(scope.dashboard));
            }
          };
        }
      };
    }
  };
});
