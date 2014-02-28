(function(){
angular.module('angoose.ui.directives').directive("deformView", function(){
      var directive = {
        restrict:'A',
        scope:true,
    };
    
    directive.controller = function($scope, $element, $attrs, $routeParams, $injector, MessageBox, $ui){
        enterscope($scope,"DeformView");
        prepareInstance($scope, $injector, $routeParams, MessageBox, $ui);
        $scope.readonly = true;
    }
    return directive;
    
}).directive("deformEdit", function(){
     var directive = {
        restrict:'A',
        scope:true,
    };
    
    directive.controller = function($scope, $element, $attrs, $location, $routeParams, $injector, MessageBox, $ui){
        enterscope($scope,"DeformEdit");
        $scope.isNew = $location.path().indexOf("create")>0; 
        prepareInstance($scope, $injector, $routeParams, MessageBox, $ui);
        $scope.saveForm = function(){
            if(!$scope.instance) return;
            // depopulate
            $scope.instance.save(function(err, result){
                if(err) MessageBox.error(err);
                else{
                    MessageBox.success("Successfully saved data.", function(){
                      //$location.path("/deform/" + $scope.dmeta.modelName+"/list");  
                      window.history.back();
                    });
                } 
            })
        }
        $scope.reset = function(){
            $scope.instance = modelClass.$get({_id: modelId});
        }
        $scope.cancelEdit = function(){
            window.history.back();
        }
        
    }
    return directive;
});
function prepareInstance($scope, $injector, $routeParams, MessageBox, $ui){
        console.log("prepare scope", $scope.$id, " parent id", $scope.$parent.$id)
        var modelClass = $injector.get( $ui.camelcase($routeParams.modelName));
        var modelId = $routeParams.modelId;
        
        function processSchema(modelName, modelClass){
            $scope.dmeta = {
                modelName: $routeParams.modelName,
                modelClass: modelClass,
                modelSchema: modelClass.schema
            }
            var groups = {};
            groups.sorted_groups  = [""]; // work around angular's collectionKeys.sort 
            var refPaths = [];
            var indx = 0;
            Object.keys(modelClass.schema.paths).forEach(function(path){
                var data = modelClass.schema.paths[path];
                if($ui.filterPath(path,data, modelClass.schema)) return;
                var group = "";
                if(path.indexOf(".")>=0)
                    group = path.substring(0, path.indexOf("."));
                group = group == 'meta' ? "": group; // meta is considered default group
                if(groups.sorted_groups.indexOf(group)<0) groups.sorted_groups.push(group);
                
                groups[group] = groups[group] || {}
                groups[group][path] = data;
                groups[group].sorted_paths = groups[group].sorted_paths||[];
                groups[group].sorted_paths.push(path);  
                if(data.instance == 'ObjectID' && data.options.ref) refPaths.push(path);    
            });
            
            $scope.groups = groups;
        }
        
        
        if(!$scope.isNew){
            modelClass.findById(modelId).done(function(modelInstance){
                $scope.instance =  modelInstance;
                modelClass = modelInstance.constructor || modelClass;
                processSchema(modelClass.name, modelClass);
  
            }, function(err){
                console.error(err);
                MessageBox.error(err);
            });    
        }
        else {
            $scope.instance =  new modelClass();
            processSchema($routeParams.modelName, modelClass);
            
        }
        
            
        
}   

})(); // scope wrapper