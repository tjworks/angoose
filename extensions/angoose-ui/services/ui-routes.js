;angular.module('angoose.ui.services').config(['$routeProvider', function($routeProvider ) {
    console.log("configuring angoose-ui routes");
    $routeProvider.
    when("/deform/:modelName/list-:customController", {template: resolveTemplate('list')}).
    when("/deform/:modelName/list", {template: resolveTemplate('list')}).
    when("/deform/:modelName/create", {template:resolveTemplate('edit')}).
    when("/deform/:modelName/update/:modelId", {template:resolveTemplate('edit')}).
    when("/deform/:modelName/edit/:modelId", {template:resolveTemplate('edit')}).
    when("/deform/:modelName/view/:modelId", {template:resolveTemplate('view')});

    function resolveTemplate(name){
        console.log("---------------- Resolving template for ",name)
        var tmpName  = "deform."+ name+".tpl"
        var contents =  $angooseTemplateCache(tmpName);
        contents = "<div ang-" + name+">"   + contents+ "</div>";
        return contents;
    }
}]).run(['$ui','$rootScope', function($ui, $rootScope){
    console.log("settup $define");
    $rootScope.defineQuery = function(meta){
        $ui.defineQuery(this, meta);
    } 
}]);
 