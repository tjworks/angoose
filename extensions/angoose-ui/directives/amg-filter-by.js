angular.module('angoose.ui.directives').directive("deformFilterBy", function($ui){
    function schemaType(schema){
        var type = $ui.getter(schema, 'options.type');
        return type;
    } 
    var directive = {
        restrict:'A', 
        scope:true
    }
     directive.link = function($scope,  $element, $attrs){
        enterscope($scope, "filterby "+ $attrs.deformFilterBy)
        var filterField  =    $attrs.deformFilterBy; //@ todo: evaluatable? $scope.$eval($attrs.deformFilterBy);
        var filterOp = $attrs.filterOp || 'contains';
        var searchable = true;
        
        if(schemaType($scope.fieldSchema) == 'Number'){
            searchable = false;
        }
        if($ui.getter($scope.fieldSchema, 'options.searchable') !== undefined){
             searchable = false;  
        }
        $scope.searchable = searchable ;
        if(!searchable) return;
        if(!$scope.dmeta) throw "ang-filter-by must be used in ang-list scope"
        
        if($ui.isCustomRef( $scope.fieldSchema)){
            filterField = $ui.getCustomRefKeyfieldPath($scope.fieldSchema);
        }
        var spec = $scope.dmeta.spec;
        var keyupHandler  =  function(){
            spec.filter = spec.filter || {};
            console.log($attrs.deformFilterBy, " value is " , $element.val());
            var term = $element.val();
            if(!term){
                // empty string, remove this criteria
                delete spec.filter[filterField]
            }
            //if(term && term.length == 1)  return;
            if( filterOp == 'contains' ){
                spec.filter[filterField] = { $regex: term, $options:'i'};
                spec.random = new Date() + Math.random(); // angular.equals() ignores the property name starts with $, so we set a random value to trigger the $watch   
            }
            else if(filterOp == 'equals'){
                spec.filter[filterField] = term;
            }
        }
        $element.on("keyup", $ui.debounce(500,  function(){
            $scope.$apply(keyupHandler)
        })) ; 
         
     }
    return directive;
});  

 