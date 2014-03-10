angular.module('angoose.ui.directives').directive('deformSortable', function($ui, angoose){
    var directive = {
        restrict:'AE',
        scope:true 
    };
    directive.compile = function(element, attrs){
        element.html( '<span ng-click="doSort()">' + element.html() + '</span>'  );
        return  function($scope,$element, $attrs ){
            enterscope($scope, "ang-sortable ",  $attrs.path);
            var sortBy = $attrs.deformSortable;
            if(!sortBy) throw "deform-sortable directive requires a value to be specified as the sorting field."
            var schema = $ui.getPathSchema($scope.dmeta.modelClass, sortBy);
            //console.log("schema is", schema);
            if(schema && schema.options && schema.options.sortable === false) return;
            //if(!schema || !schema.options || !schema.options.sortable) return;
            if(!$scope.dmeta) throw "deform-sortable must be used in deform-listing scope"
             var spec = $scope.dmeta.spec;
             $element.removeClass("sort-up").removeClass("sort-down");
             if(spec.sortBy == sortBy ){
                $element.addClass(  (spec.sortDir && spec.sortDir.toLowerCase() == 'desc') ? "sort-down":"sort-up");
             }
            $element.addClass("sort-clickable");
            
            $scope.doSort =  function(){
                //if(!schema.options.sortable) return;
                console.log("sort by clicked", sortBy);
                if(spec.sortBy == sortBy){
                    // reverse direction
                    spec.sortDir =   (spec.sortDir && spec.sortDir.toLowerCase() == 'desc') ? 'asc':'desc';
                }        
                else {
                    spec.sortBy = sortBy;
                }
                $element.parent().parent().find(".sort-up").removeClass("sort-up")
                $element.parent().parent().find(".sort-down").removeClass("sort-down")
                $element.addClass(  (spec.sortDir && spec.sortDir.toLowerCase() == 'desc') ? "sort-down":"sort-up");
                console.log("Current sort", spec.sortBy , spec.sortDir )
                //$scope.$parent.$digest();
            };
        } // end link
    }; //end compile
    return directive;
    
});  