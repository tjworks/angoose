angular.module('angoose.ui.directives').directive("deformRender", function($controller, $ui, $filter, $http, $templateCache, $compile){
    
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
            var rawValue = $ui.getter($scope.instance, path );
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
                if( rawValue && $ui.getter( pathSchema, 'options.type') == 'Date' ){
                    $scope.value = $filter('date')( new Date(rawValue), 'short');
                }   
                $scope.value = $scope.value ||  rawValue;
            }
            if(path  == '$ACTION'){
                var template = $ui.getter($scope.dmeta ,  'templates.action') || 'deform-list-action-edit-delete';
                function compileTemplate(templateHtml){
                    templateHtml="<div>"+ templateHtml+"</div>"
                    var em = angular.element(templateHtml)
                    $element.append(em);
                    $compile(em)($scope);
                }
               
                if(template.indexOf("deform") !=0){
                    console.log("template content itself");
                    return compileTemplate(template);
                }
                $http.get(template, {cache:$templateCache}).then(function(response) {
                    console.log("Loading template", template, response.data)
                    compileTemplate(response.data);
                }, function(response) {
                  throw new Error('Template not found: ' + template);
                  //console && console.error("teamplte note found", templateName)
                });    
            }
         }// end link function
     }// end compile function
     return directive;
});
 
 
  