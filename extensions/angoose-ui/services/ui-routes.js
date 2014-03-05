;angular.module('angoose.ui.services').config(['$routeProvider', function($routeProvider ) {
    console.log("configuring angoose-ui routes");
    
    
    
    $routeProvider.
    when("/deform/:modelName/list-:customController", {template: resolveTemplate('list')}).
    when("/deform/:modelName/list", {template: resolveTemplate('list')}).
    when("/deform/:modelName/create", {template:resolveTemplate('edit')}).
    when("/deform/:modelName/update/:modelId", {template:resolveTemplate('edit')}).
    when("/deform/:modelName/edit/:modelId", {template:resolveTemplate('edit')}).
    when("/deform/:modelName/view/:modelId", {template:resolveTemplate('view')});
    
    // list/create
    $routeProvider.when("/deform/:modelName/list/:customCtrl", {template: fn('list') });
    $routeProvider.when("/deform/:modelName/create/:customCtrl", {template: fn('create')});
    $routeProvider.when("/deform/:modelName/update/:customCtrl/:modelId", {template: fn('edit')}); 
    $routeProvider.when("/deform/:modelName/edit/:customCtrl/:modelId", {template: fn('edit')});
    $routeProvider.when("/deform/:modelName/view/:customCtrl/:modelId", {template: fn('view')});

    function fn(actionType){
        return function customResolve(params){
            console.log("--------- custom resolve", actionType, params);
            
            var ctrl =decamelcase(params.modelName) +"-" +actionType+"-"+ params.customCtrl;
            return resolveTemplate(actionType, ctrl);
        }   
    }

    function resolveTemplate(name, customCtrl){
        console.log("---------------- Resolving template for ",name)
        
        name = name == 'create' ? 'edit': name;
        
        var tmpName  = "deform."+ name+".tpl"
        var contents =  $angooseTemplateCache(tmpName);
        contents = "<div ang-" + name+   (customCtrl? " ng-controller='" + customCtrl+"'": "") +">"  + contents+ "</div>";
        return contents;
    }
    
    function decamelcase (name){
        // convert ClientUser to client-user 
        if(!name) return name;
        var ret = "";
        for(var i=0;i<name.length;i++){
            var c = name.charAt(i);
            if(c.toLowerCase() != c && ret.length>0) ret+="-"
            ret += c;
        }
        return ret.toLowerCase();
    }

 

}]);