;(function(){


angular.module('angoose.ui.services').factory('AngooseForm',function(  angoose, $q, $timeout){
    
    function AngooseForm(scope){
        angoose.logger.trace("Created form object for scope", scope.$id);
        this.scope = scope;
        scope.$form = this;
    }
    // update the spec with new options.
    // new options will override the existing ones
    AngooseForm.prototype.update = function(options){
        angoose.logger.trace("Updating form spec", options);
        options = options || {};
        angular.extend(this, options);
        // this.modelName = options.modelName || this.modelName
        // this.pageTitle = options.pageTitle || this.pageTitle;
        // this.template = options.template || this.template;
        // this.modelId = options.modelId || this.modelId;
        return this;
    }
    AngooseForm.prototype.get =   getter;
    return AngooseForm;
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
