(function(){
angular.module('angoose.ui.directives').directive("deformView", viewDirective).directive("deformEdit",  editDirective);
angular.module('angoose.ui.directives').directive("angView", viewDirective).directive("angEdit",  editDirective);


function viewDirective(){
      var directive = {
        restrict:'AE',
        scope:true,
    };
    
    directive.controller = function($scope, $element, $attrs, $routeParams, $injector ){
        enterscope($scope,"DeformView");
        prepareInstance($scope, $injector, $routeParams,   $attrs);
        $scope.readonly = true;
    }
    return directive;
    
}
function editDirective( $location, $routeParams, $injector, $alert ){
     var directive = {
        restrict:'AE',
        scope:true,
    };
    
    directive.compile = function(){
        return function link($scope, $element, $attrs ){
            enterscope($scope,"AngEdit");
            $scope.isNew = $location.path().indexOf("create")>0; 
            prepareInstance($scope, $injector, $routeParams,  $attrs);
            $scope.saveForm = function(){
                if(!$scope.instance) return;
                // depopulate
                $scope.instance.save(function(err, result){
                    if(err) $alert.error(err+"");
                    else{
                        window.history.back();
                        $alert.success("Successfully saved data", 10);
                        // MessageBox.success("Successfully saved data.", function(){
                          // //$location.path("/deform/" + $scope.dmeta.modelName+"/list");  
                          // window.history.back();
                        // });
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
    };
    return directive;
}
function prepareInstance($scope, $injector, $routeParams,  $attrs){
        console.log("prepare scope", $scope.$id, " parent id", $scope.$parent.$id)
        var $ui = $injector.get("$ui");
        var dmeta = $scope.dmeta = $scope.dmeta || {};
        var modelName = $ui.resolveAttribute('modelName', $scope, $routeParams, $attrs)
        
        var modelClass = $injector.get( $ui.camelcase( modelName));
        var modelId = $ui.resolveAttribute('modelId', $scope, $routeParams, $attrs);
        
        function processSchema(modelName, modelClass){
            $scope.dmeta = angular.extend($scope.dmeta, {
                modelName: modelName,
                modelClass: modelClass,
                modelSchema: modelClass.schema
            });
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
                $injector.get('$alert').error(err+"");
            });    
        }
        else {
            $scope.instance =  new modelClass();
            processSchema( modelName, modelClass);
            
        }
        
            
        
}   

})(); // scope wrapper