(function(){
    
var serviceProvider = function () {
    var uiOptions ={
        '$query-error': 'throw'  // throw | alert | none, used to specify what happens when there is error loading data
    };
    var service = {
            getReference: getRef,
            getPathSchema:getPathSchema,
            debounce:debounce,
            initQuery:initQuery,
            isCustomRef:isCustomRef,
            camelcase:camelcase,
            decamelcase:decamelcase,
            extractTemplate:extractTemplate,
            getter:getter,
            setter:setter,
            getCustomRefKeyfieldPath:getCustomRefKeyfieldPath,
            getCustomRefValue:getCustomRefValue,
            filterPath:filterPath
    }
    this.$get = function ($http, $templateCache, $q) {
            service.loadFieldTemplate = function(fieldTemplate){
                fieldTemplate = fieldTemplate.replace(".html", "");
                fieldTemplate = 'deform.field.' + fieldTemplate+".tpl";
                return this.loadTemplate( fieldTemplate);
            }
            service.loadTemplate = function(templateName){
                console.log("Loading   template", templateName)
                var deferred = $q.defer();
                var html = $angooseTemplateCache(templateName) || "Template not cached: " + templateName
                deferred.resolve( angular.element(html));
                return deferred.promise;
                
                //var templateUrl = service.resolveTemplateUrl(templateName);
                // return $http.get(templateName, {cache:  $templateCache }).then(function(response) {
                  // return angular.element(response.data);
                // }, function(response) {
                  // throw new Error('Template not found: ' + templateName);
                  // //console && console.error("teamplte note found", templateName)
                // });
            }
            // service.resolveTemplateUrl = function(templateName){
                // var templateUrl = deformOptions.templateDir +"/"+ templateName +".tpl.html";
                // return templateUrl;
            // }
            return service;  
    };
    this.config = function(name, val){
        if(typeof(name) === 'object')
            uiOptions = angular.extend(uiOptions, opts)
        else if(name){
            if( val === undefined) return getter(uiOptions, name);
            setter(uiOptions, name, val)    
        }
    };
};    
    
angular.module('angoose.ui.services').provider('$ui', serviceProvider).provider('$deform', serviceProvider);

function filterPath(path, data, schema){
    
    if(data.options.editable === false) return true;
    if(schema && schema.options && schema.options.discriminatorKey == path) return true;
    if(path.indexOf("-")>0 || path == 'type') return true; /** cannot handle hyphen */
    
    if(getter(data, "schema.options.editable") === false) {
        return true
    }
    return false;
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
function getRef(pathSchema){
    var opts = pathSchema.options;
    
    /** Mongoose, array of ObjectIDs */
    if( Array.isArray(opts.type) && opts.type.length>0  &&  opts.type[0] && opts.type[0].ref ) 
        return opts.type[0].ref;
    /** Single ObjectID Reference*/
    if(pathSchema.instance == 'ObjectID' && opts.ref) return opts.ref;
    
    
    if(pathSchema.options.ref && pathSchema.instance == 'CustomRef'){
        /** deform custom ref*/
       return pathSchema.options.ref;    
    }
    /** deform rich reference, array */
    if(Array.isArray(opts.type ) && pathSchema.caster && 
            pathSchema.caster.instance == 'CustomRef' && pathSchema.caster.options.ref ){ 
        return pathSchema.caster.options.ref;
    }
        
    return null;
} 
function isCustomRef(pathSchema){
    return pathSchema && (pathSchema.instance == 'CustomRef' || (pathSchema.caster && pathSchema.caster.instance == 'CustomRef'));
}

function getCustomRefKeyfieldPath(pathSchema){
    if(!isCustomRef(pathSchema)) return undefined;
    return pathSchema.path +"." + (getter(pathSchema, 'options.keyField') || 'name');
}
function getCustomRefValue(instance, pathSchema){
    var path = getCustomRefKeyfieldPath(pathSchema);
    if(!path) return undefined;
    var name = getter(instance, path);
    if(path.indexOf("sortable")>=0) 
        return formatSortable(name);
    if(name && (name.first || name.last)) name =( name.first || "")+" "+ (name.last || ""); 
    return name;
}

function camelcase(name){
    // converting client-user to ClientUser 
    if(!name) return name;
    var parts = name.split("-");
    name = "";
    for(var i=0;i< parts.length;i++){
        if(parts[i] && parts[i].length>0) name+= parts[i].substring(0,1).toUpperCase() + parts[i].substring(1);
    }
    return name;
}
function decamelcase(name){
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
function trim(str){
    return str? str.replace(/^\s*(.*?)\s*$/, "$1"): str;
}
function formatSortable(sortable){
    if(!sortable || typeof(sortable)!=='string') return sortable;
    sortable = trim(sortable.toLowerCase()).replace(/null/i, '');
    var parts = sortable.split(",");
    if(parts.length != 2)
        parts = sortable.split(" ");
    if(parts.length >1){
        return  camelcase(trim(parts[1])) +" "+ camelcase( trim(parts[0]));
    }
    return sortable;
}
 
function getPathSchema(modelClass, path){
    var modelSchema = modelClass.schema;
    return modelSchema.paths && modelSchema.paths[path];
}


/**
 * Debounces a function. Returns a function that calls the original fn function only if no invocations have been made
 * within the last quietMillis milliseconds.
 *
 * @param quietMillis number of milliseconds to wait before invoking fn
 * @param fn function to be debounced
 * @param ctx object to be used as this reference within fn
 * @return debounced version of fn
 */
function debounce(quietMillis, fn, ctx ) {
    ctx = ctx || undefined;
    var timeout;
    return function () {
        var args = arguments;
        clearTimeout(timeout);
        timeout = setTimeout(function() {
            fn.apply(ctx, args);
        }, quietMillis);
    };
}

function initQuery($scope, options){
    //@todo: use auto merge/extend
    
    options = options || {};
    $scope.dmeta = $scope.dmeta || {};
    var dmeta = $scope.dmeta;
    dmeta.modelName = options.modelName || dmeta.modelName
    dmeta.columns = options.columns || dmeta.columns;
    dmeta.render = options.render || dmeta.render;
    
    dmeta.spec = dmeta.spec || {};
    dmeta.spec.filter = dmeta.spec.filter || {} ;
    
    dmeta.spec.preset = options.preset || dmeta.spec.preset;
    dmeta.spec.sortBy = options.sortBy || dmeta.sortBy 
    dmeta.spec.sortDir = options.sortDir || dmeta.sortDir
    
    dmeta.templates = options.templates || dmeta.templates;
    
    dmeta.pageTitle = options.pageTitle || dmeta.pageTitle;
    dmeta.actionColumn = options.actionColumn ===undefined?  dmeta.actionColumn :options.actionColumn   ;
    
    $scope.query = dmeta;
    return dmeta;
}

function extractTemplate(f){
      return f.toString().
          replace(/^[^\/]+\/\*!?/, '').
          replace(/\*\/[^\/]+$/, '');
}


})();
