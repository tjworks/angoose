;(function(){


angular.module('angoose.ui.services').factory('AngooseQuery',function(angoose,  $q, $timeout){
    
    function AngooseQuery(scope){
        angoose.logger.trace("Created Query object for scope", scope.$id);
        this.scope = scope;
        scope.dmeta = this;
        this.showAdd = true;// default
        // some initial structure
        this.spec = { filter: {}}
    }
    AngooseQuery.prototype.refresh = function(){
        this.update(null, true);
    }
    // update the spec with new options.
    // new options will override the existing ones
    AngooseQuery.prototype.update = function(options, forceRefresh){
        angoose.logger.trace("Updating Query spec", options);
        if(!options && !forceRefresh) return;
        options = options || {};
        //@todo: below is a mess
        var dmeta = this;
        dmeta.modelName = options.modelName || dmeta.modelName
        dmeta.columns = options.columns || dmeta.columns;
        dmeta.render = options.render || dmeta.render;
        
        
        if(options.preset)
            dmeta.spec.preset = options.preset || dmeta.spec.preset;
        if(options.defaultFilter)
            dmeta.spec.preset = options.defaultFilter || dmeta.spec.preset;
        
        dmeta.spec.sortBy = options.sortBy || dmeta.sortBy 
        dmeta.spec.sortDir = options.sortDir || dmeta.sortDir
        
        dmeta.templates = options.templates || dmeta.templates;
        dmeta.template = options.template || dmeta.template;
        dmeta.templateUrl = options.templateUrl || dmeta.templateUrl;
        
        dmeta.pageTitle = options.pageTitle || dmeta.pageTitle;
        dmeta.actionColumn = options.actionColumn ===undefined?  dmeta.actionColumn :options.actionColumn   ;
        
        dmeta.showAdd = options.showAdd === undefined? dmeta.showAdd : options.showAdd; 
        
        if(  forceRefresh) dmeta.spec.trigger = new Date(); // this     
        return this;
    }
    AngooseQuery.prototype.get =   getter;
    return AngooseQuery;
});  
             

function getter(obj, p){
    if(!p || !obj) return undefined;
    var p = p.split('.');
    var o = obj;
    for (var i = 0; i < p.length; i++){
        if(!o || typeof o != "object") return undefined;
        o = o[p[i]]
    } 
    return o;
}    

})();
