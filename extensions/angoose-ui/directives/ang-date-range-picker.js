
/** beta version
 * example :
 * function Ctrl($scope){
 *  $scope.logDate=function(startDate,endDate){
 *      console.log(startDate,endDate)
 *  }
 * }
 * <div ng-controller="Ctrl">
 *  <ang-date-range-picker  apply="logDate(startDate,endDate)"></ang-date-range-picker>
 * </div>
 *  attribute :
 *      options: (optional)
 *          shortcuts: (Array of integer) which will display a list of button to set startDate to preDays from now
 *  <ang-date-range-picker options="{shortcuts:[7,15,30,90,120]}" apply="apply(startDate,endDate)"></ang-date-range-picker>
 * **/
(function(){
    angular.module('angoose.ui.directives').directive('angDateRangePicker', dateRangePickerFactory);
    // TODO  need to export template to template file
    function dateRangePickerFactory(){
        return {
            restrict: 'EA',
            scope: {
                options: "=?",
                data: "=",
                applyFn: "&apply"
            },
            template:
                "<button class='btn ' href='#' ng-repeat='shortcut in options.shortcuts' ng-click='preDays(shortcut)'>Last {{shortcut}} Days</button>" +
                "<button class='btn ' href='#' ng-click='preDays(10000)'>All</button>" +
                "<input ng-model='startDate' ng-class='{error:startDate>endDate}' max='endDate' datepicker-popup  />" +
                "-" +
                "<input ng-model='endDate' ng-class='{error:startDate>endDate}' min='startDate' datepicker-popup  />" +
                "<button class='btn btn-success' href='#' ng-click='apply()' >Apply</button>",
            controller: function($scope) {
                    $scope.startDate = new Date();
                    $scope.endDate = new Date();
                if (!$scope.options) {//TODO use merge method
                    $scope.options = {
                        shortcuts: [7, 15, 30]
                    };
                }
                $scope.preDays = function(days) {
                    $scope.startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
                    $scope.apply();
                };
                $scope.apply = function() {
                    return $scope.applyFn({
                        startDate: $scope.startDate,
                        endDate: $scope.endDate
                    });
                };
            }
        };
    }
})();