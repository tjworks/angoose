(function(){
angular.module('angoose.ui.directives').directive("deformView", function(){
      var directive = {
        restrict:'A',
        scope:true,
    };
    
    directive.controller = function($scope, $element, $attrs, $resource, $routeParams, $injector, MessageBox, $ui){
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
    
    directive.controller = function($scope, $element, $attrs, $resource,$location, $routeParams, $injector, MessageBox, $ui){
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
}).directive("deformListing", function( $templateCache, $routeParams, $location, $injector, MessageBox, $log ,$route, $ui, $controller){
    // this is the main controller for the sort-paging-filtering list
    var directive = {
        restrict:'AE'
    }; 
    directive.compile = function(element, attrs){
        console.debug("In deformlisting compile");
        var preLink = function($scope, $element, $attrs){
            /** we do this in prelink because child directives needs the dmeta setup below */
            enterscope($scope, "Deform Listing prelink");
            
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
        } // end link
        return {pre:preLink, post:postLink }
        
    }; // end compile
   
    return directive;
}).directive('deformSortable', function($ui){
    var directive = {
        restrict:'AE',
        scope:true 
    };
    directive.compile = function(element, attrs){
        console.log(" in deformSotable compiling");
        element.html( '<span ng-click="doSort()">' + element.html() + '</span>'  );
        return  function($scope,$element, $attrs ){
            enterscope($scope, "sortable!! "+ $attrs.path);
            var sortBy = $attrs.deformSortable;
            if(!sortBy) throw "deform-sortable directive requires a value to be specified as the sorting field."
            var schema = $ui.getPathSchema($scope.dmeta.modelClass, sortBy);
            console.log("schema is", schema);
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
    
}).directive("deformFilterBy", function($ui){
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
        if(getter($scope.fieldSchema, 'options.searchable') !== undefined){
             searchable = false;  
        }
        $scope.searchable = searchable ;
        if(!searchable) return;
        if(!$scope.dmeta) throw "deform-filter-by must be used in deform-listing scope"
        
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
}).directive("deformSublist", function(){
  var directive = {
      restrict:'AE',
      templateUrl: '/js/deform/tpl/deform.sublist.tpl.html',
      scope:{
          instance:'=',
          path:'=',
          modelSchema:'=',
          fieldSchema:'='
      },
      compile: function(element, attrs){
          //element.html("sub elements");
          return function link(scope, element, attrs){
              enterscope(scope, "sublist path "+ scope.path)
              console.debug("our data: ", getter(scope, 'instance.'+ scope.path));
              scope.getter = getter;
              console.log("Creating sublist ", scope.$id)
              // we can't just use sublist because nested scopes - where subscope may override parents
              scope['sublist'+ scope.$id] = getter(scope, 'instance.'+ scope.path) || [];
              setter(scope, 'instance.'+ scope.path, scope['sublist'+ scope.$id] );
              scope.subschema =  getter(scope.fieldSchema, 'schema');
              Object.keys(scope.subschema.paths).forEach(function(path){
                  if(filterPath(path, scope.subschema.paths[path], scope.subschema)){
                    delete scope.subschema.paths[path];  
                  } 
              });
              scope.sublist  = function(scopeId){
                  return scope['sublist'+ scopeId];
              }
              scope.removeSublistItem = function($index){
                  scope.sublist(scope.$id).splice($index, 1)
              }
              scope.addSublistItem = function(){
                  scope.sublist(scope.$id).push({__toggle:1})
              }
          }
      }
  };
  return directive;   
}).directive("deformSubschema", function(){
    var directive = {
      restrict:'AE',
      templateUrl: '/js/deform/tpl/deform.subschema.tpl.html',
      compile: function(element, attrs){
          //element.html("sub elements");
          return function link(scope, element, attrs){
              enterscope(scope, 'sbuschema: ' + scope.path);
              scope.getter = getter;
              scope.subschema = scope.modelSchema && getter( scope.modelSchema.paths[  scope.path ], 'schema');
          }
      }
  };
  return directive;   
}).directive('deformPaginator', function(){
    // this sub directive handles the paging. It can only used inside the the spflist
    var directive = {
        restrict:'A',
        template: paginatorTemplate(), 
        //scope:true
    }
    directive.link = function($scope,$element, $attrs){
        enterscope($scope, "paginator");
        if(!$scope.dmeta) throw "Paginator must be used in deform-listing scope"
        var spec = $scope.dmeta.spec;
        spec.page = 1;
        spec.start = 1;
        spec.pageSize = 25; 
        if($attrs.pageSize) 
            spec.pageSize = parseInt($attrs.pageSize) 
        spec.$end = spec.start + spec.pageSize -1;
            
        $scope.nextPage = function(e){
                console.log("next page clicked", arguments)
            if(  spec.start + spec.pageSize > spec.$total) return;
            $scope.setPage (spec.page + 1);
        }
        $scope.previousPage = function(){
            console.log("previous page clicked")
            if( spec.page <=1) return;
            $scope.setPage(spec.page -1);
        }
        $scope.setPage = function(pageNo){
            console.log("Set page called with number ", pageNo );
            spec.page = pageNo || spec.page ;
            spec.start = (spec.page -1 ) * spec.pageSize + 1
            spec.$end = spec.start + spec.pageSize -1;
        }
        //$scope.setPage();
        $scope.paginator = spec;
    }
    return directive;
}).directive("deformRender", function($controller, $ui, $filter, $http, $templateCache, $compile){
    
     var directive = {
        restrict:'AE'
     }
     directive.compile = function(element, attrs){
        if(attrs.path == '$ACTION'){
            element.html('');
        }
        return  function postLink($scope, $element, $attrs){
            var path = ($scope.fieldSchema && $scope.fieldSchema.path) || $attrs.path;
            var pathSchema =$scope.fieldSchema;
            enterscope($scope, "deformRender " +  path +" #"+ $attrs.row);
            
            var row = $attrs.row;
            var rawValue = getter($scope.instance, path );
            $scope.value = undefined;
            if( typeof($scope.dmeta.render) == 'function'){
                $controller(  $scope.dmeta.render, {   
                                        $scope:$scope, 
                                        $path:path, 
                                        $value:rawValue,
                                        $row: $attrs.row,
                                        $element: $element
                });
            }
            if(typeof($scope.value)=='undefined' && path !='$ACTION'){
                // unhandled, default handler
                if($ui.isCustomRef(pathSchema)){
                    $scope.value = $ui.getCustomRefValue($scope.instance, pathSchema);
                }
                if( rawValue && getter( pathSchema, 'options.type') == 'Date' ){
                    $scope.value = $filter('date')( new Date(rawValue), 'short');
                }   
                $scope.value = $scope.value ||  rawValue;
            }
            if(path  == '$ACTION'){
                var template = getter($scope.dmeta ,  'templates.action') || 'deform-list-action-edit-delete';
                function compileTemplate(templateHtml){
                    var em = angular.element(templateHtml)
                    $element.append(em);
                    $compile(em)($scope);
                }
                if(template.indexOf("deform") !=0){
                    return compileTemplate(template);
                }
                $http.get(template, {cache:$templateCache}).then(function(response) {
                    compileTemplate(response.data);
                }, function(response) {
                  throw new Error('Template not found: ' + template);
                  //console && console.error("teamplte note found", templateName)
                });    
            }
         }// end link function
     }// end compile function
     return directive;
})




function getter(obj, p){
    if(!p || !obj) return undefined;
    var p = p.split('.');
    var o = obj;
    for (var i = 0; i < p.length; i++){
        if(typeof o != "object") return undefined;
        o = o[p[i]]
    } 
    return o;
}     

function setter(doc, path, val){
    if(!path || !doc ) return;
     var   pieces = path.split('.');
      var obj = doc;
      for (var i = 0, len = pieces.length; i < len; i++) {
          if(i+1  == len ) // last one
          {
              obj[ pieces[i]] = val;
              return;
          }
          obj[pieces[i]] = obj[pieces[i]] || {};
          obj = obj[pieces[i]] || {};
      }
}
function filterPath(path, data, schema){
    
    if(data.options.editable === false) return true;
    if(schema && schema.options && schema.options.discriminatorKey == path) return true;
    if(path.indexOf("-")>0 || path == 'type') return true; /** cannot handle hyphen */
    
    if(getter(data, "schema.options.editable") === false) {
        return true
    }
    return false;
}

function schemaType(schema){
    var type = getter(schema, 'options.type');
    return type;
}
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
                if(filterPath(path,data, modelClass.schema)) return;
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

function paginatorTemplate(){
    return "<span style='display: inline;'> {{ paginator.start }} - {{ paginator.$end > paginator.$total ? paginator.$total: paginator.$end }} of {{ paginator.$total }}\n" +
             
            "    <span class='break'></span>\n" + 
            "  <span ng-if='paginator.pageSize < paginator.$total' >"+
            "    <span href='#' class='box-page' ng-click='previousPage()' style='cursor:pointer' ><i class='icon-chevron-left'></i></span>" + 
            "    <span class='break'></span>\n" + 
            "    <span href='#' class='box-page' ng-click='nextPage()' style='cursor:pointer'><i class='icon-chevron-right'></i></span>" +
            "  </span>"+ 
            "</span>\n" + 
            "";
}

})(); // scope wrapper



function enterscope(scope, name) {
	console.debug("Entering scope ", name, scope.$id)
	window['scope' + scope.$id] = scope;
}
