/**
 * Deform field directives
 *  
 * 
 * Usage:
 * 
 * 
 */
(function(){
angular.module('angoose.ui.controllers'  ).controller("dfc-select", function($scope, $injector, $schema ){
        //console.log("In Select Ctrl", $scope.path , $schema  );
        if(!$schema || !$schema.options || !$schema.options['enum'] || !$schema.options['enum'].length) return;
        $scope.selectOptions = {};
        
        angular.forEach($schema.options['enum'], function(item){
            $scope.selectOptions[item] = item;
        });
        // set the default value
        if(  $schema.options['default'] && $scope.path  && $scope.instance && !$scope.instance[$scope.path])
            $scope.instance[$scope.path] =   $schema.options['default'];
});
 
 


})();  // end enclosure