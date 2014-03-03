(function(){
angular.module('angoose.ui.directives').directive("deformListing", angList ).directive("angList", angList);

function angList( $templateCache, $routeParams, $location, $injector, MessageBox, $log ,$route, $ui, $controller){
    // this is the main controller for the sort-paging-filtering list
    var directive = {
        restrict:'AE'
    }; 
    directive.compile = function(element, attrs){
        console.debug("In ang-list compile");
        var preLink = function($scope, $element, $attrs){
            /** we do this in prelink because child directives needs the dmeta setup below */
            enterscope($scope, "ang-list  prelink");
            
            /**@todo: calling custom controller here is kinda not the right angular way, but we augment the $scope */
            if($routeParams.customController){
                 $controller ( ($routeParams.modelName+"-list-"+ $routeParams.customController).toLowerCase(), {$scope: $scope});
            }
            
            var thisRoute = $route.current.$$route;
            
            var dmeta = $ui.initQuery($scope, thisRoute && thisRoute.deformQuery);
            // $scope.dmeta = $scope.dmeta || {};
            // var dmeta = $scope.dmeta; 
            /** order or presedence: custom controller -> directive -> route params  */
            dmeta.modelName =   dmeta.modelName || $attrs.modelName || $routeParams.modelName ; 
            try{
                dmeta.modelClass = $injector.get($ui.camelcase( dmeta.modelName  ));    
            }
            catch(err){
                console.error("Error in deformListing controller", err)
                MessageBox.error("Model "+ dmeta.modelName+" is not defined")
                return;
            }
            
            dmeta.pageTitle = dmeta.pageTitle || $ui.camelcase(dmeta.modelName) + " List"
            dmeta.actionColumn = dmeta.actionColumn === undefined ? true: dmeta.actionColumn;
            if(Array.isArray(dmeta.columns) && dmeta.columns.length > 0){
                var cols = [];
                for(var i=0;i< dmeta.columns.length;i++){
                    var item = dmeta.columns[i];
                    var pathname = typeof(item) == 'string'? item: item.path;
                    var original = $ui.getPathSchema(dmeta.modelClass, pathname);
                    if(typeof(item) == 'object') 
                        item = angular.extend( angular.extend({}, original), item)
                    else
                        item = original;
                    if(!item)  item = {path: pathname, options: {sortable:false } } 
                    cols.push( item );
                }
                dmeta.columns = cols;
            }
            else
                dmeta.columns =  findTagged(dmeta.modelClass, 'default-list');
            //dmeta.spec = dmeta.spec || { filter:{} }
            var spec = dmeta.spec;
            // controller -> directive
            if(!spec.preset && $attrs.defaultFilter)  
                spec.preset =  $scope.$eval($attrs.defaultFilter);
            
            var defaultSortField = getDefaultSortField(dmeta.modelClass) ;
            //controller -> directive -> default
            spec.sortBy = spec.sortBy || ($attrs.defaultSort? $attrs.defaultSort : '');
            spec.sortBy = spec.sortBy || (  defaultSortField? defaultSortField.path: '' );
                
            spec.sortDir = spec.sortDir || ($attrs.sortDir?$attrs.sortDir:'');
            spec.sortDir = spec.sortDir || (defaultSortField? defaultSortField.options.defsort: 'asc');
                
            //console.log($scope.dmeta.columns, " ### COLOUMNS" )
            $scope.remove = function(index){
                //MessageBox.warn("This will delete "+  $scope.instances[index].getDisplayName() +", please confirm");
                
                MessageBox.confirm("This will delete selected item, continue?", function(){
                    $scope.instances[index].remove( function(err,res){
                        if(!err){
                            MessageBox.success("Operation Successful");
                            $scope.instances.splice(index, 1);  
                        } 
                    } );    
                }, function(){
                    
                })
            }
            
            
         }
         var postLink = function($scope, $element, $attrs){
            enterscope($scope, "postlink deform listing")
            var spec =   $scope.dmeta.spec;
            
            $scope.$watch("dmeta.spec", function(newVal, oldVal){
                console.log("Filter changed", newVal, oldVal);
                // handles the search fields, we need to make a copy of the search filters so that it won't trigger the $watch
                var mQuery = angular.extend({}, spec.filter);
                if(spec.preset)
                    mQuery = angular.extend(mQuery, spec.preset); // preset filter takes presedence
                angular.forEach(mQuery, function(val, key){
                   if(val === '$CLEAR$')
                        delete mQuery[key]; 
                });
                
                var mSelection = null; //@TBD
                var mOptions = {};  // limit, skip, sort
                if(spec.sortBy){
                    mOptions.sort = (spec.sortDir && spec.sortDir.toLowerCase() == 'desc')? "-":"";
                    mOptions.sort += spec.sortBy; 
                }
                if(spec.pageSize) {
                    mOptions.limit = spec.pageSize;
                    if(spec.page > 1)
                        mOptions.skip = (spec.page-1) * spec.pageSize
                }
                    
                console.log("Updating search: ", mQuery ,mOptions, $scope.dmeta.modelName);
                $scope.instances = $scope.dmeta.modelClass.$query(mQuery, mSelection, mOptions )
                $scope.dmeta.modelClass.count(mQuery).done(function(total){
                    //if(err) $log.error("Error getting total. Query: ", mQuery, " Error:", err);
                    spec.$total = total || 0;
                }); 
               
            }, true);
            
            
            $scope.cells = [];
            
            // $compile template if provided
            // var template = getTemplate(scope.data);
            // element.html(template);
            // $compile(element.contents())(scope);
            
        } // end link
        return {pre:preLink, post:postLink }
        
    }; // end compile
   
    return directive;
};  // end directiveFunc

// get a list of fields with a specific tag
function findTagged(modelClass,tag){
    if(!modelClass || !modelClass.schema) return [];
    var cols = [];  
    Object.keys(modelClass.schema.paths).forEach(function(path){
        var data = modelClass.schema.paths[path];
        if(data.options.tags && data.options.tags.indexOf(tag)>=0)
            cols.push(data);
    });
    return cols;
}

function getDefaultSortField(modelClass){
    if(!modelClass || !modelClass.schema) return [];
    var ret = null; 
    Object.keys(modelClass.schema.paths).forEach(function(path){
        var data = modelClass.schema.paths[path];
        if(data.options.defsort && typeof(data.options.defsort) == 'string')
             ret = data;
    });
    return ret;
}
})(); // scope wrapper



function enterscope(scope, name) {
	console.debug("Entering scope ", name, scope.$id)
	window['scope' + scope.$id] = scope;
}
