/**
 * Deform field directives
 *  
 * 
 * Usage:
 * 
 * 
 */
(function(){
    
 
angular.module('angoose.ui.controllers').controller("dfc-datepicker", function($scope, $ui, $injector, $schema, $filter, $timeout, $modal ){
        enterscope($scope, "Datepicker "+ $scope.path);
        $scope.showTimepicker = $ui.getter( $schema, 'options.timepicker') !== false;
        $scope.openPicker = function(){
            $modal.open({
                template: $("#datepicker-template-"+$scope.$id).html(),
                scope: $scope,
                backdrop:'static'
            })    
        };
}).controller("dfControllerDatepickerModal", function($scope, $injector ,  $timeout ){
        enterscope($scope, "date picker modal");
        mydate  = $scope.$field.$viewValue; 
        if(typeof(mydate ) == 'string') mydate = new Date(mydate);
        $timeout(function(){
            
            var datepickerId =  "#datepicker"+$scope.$id;
            var picker = angular.element(datepickerId);
            picker.datepicker({
                onRender: function(date) {
                    return  '';
                }
            }).on('changeDate', function(ev) {
               $scope.holding = getDate($scope.holding, ev);
            });
            
            
            if($scope.showTimepicker){
                    var timepicker = angular.element("#timepicker"+$scope.$id);
                    timepicker.timepicker({
                        minuteStep: 5
                    }).on('changeTime.timepicker', function(e) {
                      $scope.holding = getDate($scope.holding, e);
                    });    
            }
            mydate  && picker.datepicker("setValue", ("00" + (mydate.getMonth() + 1)).slice(-2) + "/" + ("00" + mydate.getDate()).slice(-2) + "/" + mydate.getFullYear());
            
             
        }, 5)
   
    $scope.cancel = function() {
        $scope.$dismiss();
    };
    $scope.ok = function() {
        var mydate =  $scope.holding ;
        mydate  &&  $scope.$field.$setViewValue(mydate )
        $scope.$close();
    };

    function getDate(mydate, ev){
        mydate  = mydate  || new Date();
        if(ev.date){
            mydate.setFullYear(ev.date.getFullYear());
            mydate.setMonth(ev.date.getMonth());
            mydate.setDate(ev.date.getDate());    
        }
        if(ev.time){
            if (ev.time.meridian == "AM" && ev.time.hours == 12) mydate.setHours(0);
            else if (ev.time.meridian == "PM" && ev.time.hours == 12) mydate.setHours(12);
            else if (ev.time.meridian == "PM") mydate.setHours(e.time.hours + 12);
            else h = mydate.setHours(ev.time.hours);
            mydate.setMinutes(ev.time.minutes)    
        }
        if(!$scope.showTimepicker){
            mydate.setHours(0);
            mydate.setMinutes(0);
        }
            
        mydate.setSeconds(0);
        return mydate;
    }
    
});
})();  // end enclosure
 