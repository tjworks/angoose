;angular.module('angoose.ui.services').config(['$routeProvider', function($routeProvider ) {
    AngooseClient.logger.debug("Configuring angoose forms routes", AngooseClient.config('url-prefix'));
    
    var prefix = '/deform';
    
    function addRoutes(prefix){
        AngooseClient.logger.debug("adding routes for prefix", prefix);
        $routeProvider.
        when(prefix+"/:modelName/list-:customController", {template: resolveTemplate('list')}).
        when(prefix+"/:modelName/list", {template: resolveTemplate('list')}).
        when(prefix+"/:modelName/create", {template:resolveTemplate('edit')}).
        when(prefix+"/:modelName/update/:modelId", {template:resolveTemplate('edit')}).
        when(prefix+"/:modelName/edit/:modelId", {template:resolveTemplate('edit')}).
        when(prefix+"/:modelName/view/:modelId", {template:resolveTemplate('view')});
        
        // list/create
        $routeProvider.when(prefix+"/:modelName/list/:customCtrl", {template: fn('list') });
        $routeProvider.when(prefix+"/:modelName/create/:customCtrl", {template: fn('create')});
        $routeProvider.when(prefix+"/:modelName/update/:customCtrl/:modelId", {template: fn('edit')}); 
        $routeProvider.when(prefix+"/:modelName/edit/:customCtrl/:modelId", {template: fn('edit')});
        $routeProvider.when(prefix+"/:modelName/view/:customCtrl/:modelId", {template: fn('view')});
    
    }
    addRoutes('/deform'); // deprecated
    addRoutes('/angoose');
    if('/angoose' !== AngooseClient.config('url-prefix'))
        addRoutes(AngooseClient.config('url-prefix'));
        
    function fn(actionType){
        return function customResolve(params){
            var ctrl =decamelcase(params.modelName) +"-" +actionType+"-"+ params.customCtrl;
            return resolveTemplate(actionType, ctrl);
        }   
    }

    function resolveTemplate(name, customCtrl){
        //console.log("---------------- Resolving template for ",name)
        
        var tmpName  = "deform."+ name+".tpl"
        var contents =  $angooseTemplateCache(tmpName);
        name = 'create' == name ? 'edit':name;
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