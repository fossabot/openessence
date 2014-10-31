'use strict';

var angular = require('angular');
var directives = require('../scripts/modules').directives;

angular.module(directives.name).directive('outpatientTable', /*@ngInject*/ function ($rootScope, gettextCatalog, orderByFilter,
                                                                       FrableParams, OutpatientVisitResource,
                                                                       sortString) {
  return {
    restrict: 'E',
    template: require('./table.html'),
    scope: {
      records: '=?',
      queryString: '=',
      form: '='
    },
    compile: function (element, attrs) {
      var condensed = angular.isDefined(attrs.condensed) && attrs.condensed !== 'false';

      return {
        pre: function (scope) {
          scope.condensed = condensed;
          scope.strings = {
            visitDate: gettextCatalog.getString('Date'),
            facility: gettextCatalog.getString('Facility'),
            district: gettextCatalog.getString('District'),
            symptoms: gettextCatalog.getString('Symptoms'),
            week: gettextCatalog.getString('Week'),
            year: gettextCatalog.getString('Year'),
            sitesReporting: gettextCatalog.getString('Number of Sites Reporting'),
            sitesTotal: gettextCatalog.getString('Total Sites')
          };

          // index fields by name
          scope.$watch('form.fields', function (fields) {
            if (!fields) {
              return;
            }

            scope.fields = fields.reduce(function (fields, field) {
              fields[field.name] = field;
              return fields;
            }, {});
          });

          scope.editVisit = function (visit) {
            scope.$emit('outpatientEdit', visit);
          };

          scope.deleteVisit = function (visit) {
            scope.$emit('outpatientDelete', visit);
          };

          scope.tableParams = new FrableParams({
            page: 1, // page is 1-based
            count: 10,
            sorting: {
              visitDate: 'desc'
            }
          }, {
            total: scope.records ? scope.records.length : 0,
            counts: [], // hide page count control
            $scope: {
              $data: {}
            },
            getData: function ($defer, params) {
              if (scope.records) {
                var orderedData = params.sorting() ? orderByFilter(scope.records, params.orderBy()) : scope.records;
                $defer.resolve(orderedData.slice((params.page() - 1) * params.count(), params.page() * params.count()));
              } else {
                if (!angular.isDefined(scope.queryString)) {
                  // Wait for queryString to be set before we accidentally fetch a bajillion rows we don't need.
                  // If you really don't want a filter, set queryString='' or null
                  // TODO there's probably a more Angular-y way to do this
                  $defer.resolve([]);
                  return;
                }

                OutpatientVisitResource.get(
                  {
                    q: scope.queryString,
                    from: (params.page() - 1) * params.count(),
                    size: params.count(),
                    sort: sortString.toElasticsearchString(params.orderBy()[0]) // we only support one level of sorting
                  },
                  function (response) {
                    params.total(response.total);
                    $defer.resolve(response.results);
                  },
                  function error (response) {
                    $rootScope.$broadcast('filterError', response);
                  });
              }
            }
          });

          scope.$watchCollection('queryString', function () {
            scope.tableParams.reload();
          });

          if (scope.records) {
            scope.$watchCollection('records', function () {
              scope.tableParams.reload();
            });
          } else {
            scope.$on('outpatientReload', function () {
              scope.tableParams.reload();
            });
          }

          scope.tableFilter = function (field, value) {
            //TODO multiselect if value.length > ?
            if (value || value === false) {
              var a = [].concat(value);
              a.forEach(function (v) {
                var filter = {
                  filterID: field,
                  value: ((typeof v) === 'object' ? v.name : v)
                };
                $rootScope.$emit('filterChange', filter, true, false);
              });
            }
          };
        }
      };
    }
  };
});
