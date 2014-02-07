// This is the base class for Angoose model classes and service classes. 
// This is used internally and it's here only for listing the APIs common
// to all Model and Service classes.  

var logger = require("log4js").getLogger("angoose");
var _ = require("underscore");
var Class = require("./util/classy");

var toolbox = require("./util/toolbox");

// ### API Rereferences
// **getContext()**
//
// This method allows you obtain the execution context.
// See [Context](Context.html) for more. 
//  
// Note this method is also available on the class(function) as well. i.e.,
//
//      /** MyModel is subclass of Remotable */
//      var instance = new MyModel(); 
//      /** Following yields true */
//      MyModel.getContext() === instance.getContext(); 
//
var getContext = function(){
    return require("./angoose").getContext()
}

var  Remotable = Class.$extend({});
Remotable.prototype = {
    getContext: getContext
}

Remotable._angoosemeta ={ baseClass: 'Remotable' }
Remotable.extend = extend;
Remotable.getContext = getContext;
// ** extend **
//
// This static method is used to create Angoose model or service classes.
// All classes created using this method is a subclass of `Remotable`
function extend(target, options){
    options = options||{};
    var parentClass = this;
    logger.trace("Extending from ",   parentClass._angoosemeta.name, options);
    var rv = null;
    if(typeof (target) == 'function'){
        rv = target;
        mixinInstance(parentClass, rv, options);
        
        /**@todo: temp hack */
        bindMongooseMethods(rv);       
    }
    else{ 
        /** schema object */ 
        rv = parentClass.$extend( target );
    }
   
    /** mixin Angoose class level functions */       
    rv = mixinStatic(parentClass, rv, options);   
    if(rv._angoosemeta.name){
        /**  register it with Angoose */
       //require("./angoose").registerClass(rv._angoosemeta.name, rv);
    }
    return rv;
}
function mixinInstance(parentClass, subClass, options){
    subClass.prototype.getContext = getContext;
    
    /** look for static classes*/
   
}
function mixinStatic(parentClass, subClass, options){
    /** mixin Angoose functions to the new class */
   /** if(subClass.extend || subClass.getContext ) throw "Class already has 'extend' or 'getContext' property/method" */
   
    /** mixing static properties from parentClass to subClass */
    for(var prop in parentClass){
        var val = parentClass[prop];
        if(!parentClass.hasOwnProperty(prop) || typeof(val) != 'function') continue;
        if(isRemotableReserved(prop)) continue;
        if(subClass[prop]) {
            logger.warn("Cannot mixin subclass: property '"+ prop+"' already exists on subclass");
            throw "Subclass already has property '"+ prop+"' defined.";
        }
        //logger.trace("Mixing: ", prop)
        subClass[prop] = val;
    }   
    // subClass.extend = extend;
    // subClass.getContext = getContext;
    subClass._angoosemeta = _.extend({}, parentClass._angoosemeta);
    subClass._angoosemeta = _.extend(subClass._angoosemeta, options)
   
    return subClass;
}


function isRemotableReserved(methodName){
    /** check if method is reserved by the Remotable interface */
  return methodName.indexOf("_") == 0 || methodName.indexOf("$") == 0 || ['constructor',   'isRemotableReserved'].indexOf(methodName)>=0;   
}
/** a$ is Angoose's internal property*/
//Remotable.prototype._angoosemeta = {};

Remotable.getContext = getContext;
Remotable.isRemotableReserved=isRemotableReserved;

module.exports = Remotable


Remotable.mixin = function(opts, target){
    opts = opts || {};
    target.getSchema = getSchema;
    target._angoosemeta  = toolbox.merge(target._angoosemeta , opts);
    target._angoosemeta.baseClass = target._angoosemeta.baseClass || 'Service';
    target.getContext = getContext; //deprecated
    target.config = config;
    if(target._angoosemeta.baseClass == 'Model')
        bindMongooseMethods(target);
}

function config(path, opts){
    var conf = this._angoosemeta;
    switch(arguments.length){
        case 0: return conf;
        case 1: return toolbox.getter(conf, path);
        case 2: toolbox.setter(conf, path, opts);
    }
    return this;        
}
function getSchema(){
    var thisClass = this;
    var schema = {statics: {}, methods:{} };
    for(var name in thisClass){
        var val = thisClass[name];
        if( filter(name) ) continue;
        if(typeof (val) != 'function') continue;
        schema.statics[name] = val;
    }
    if(typeof(thisClass) == 'function'){
        schema.methods = _.extend({}, thisClass.prototype)
    }
    return schema;
}


function filter(methodName){
     if(Remotable.isRemotableReserved(methodName)) return true;
     if(['extend', 'getContext', 'getSchema','mixin','toJSON' ].indexOf(methodName)>=0) return true;
     return false;
}

function bindMongooseMethods(modelClass){
    var staticMethods = "populate,find,findOne,findById,findByIdAndRemove,findByIdAndUpdate,findOneAndRemove,findOneAndUpdate,update,remove,count,geoNear,geoSearch,aggregate".split(",");
    _.each(staticMethods, function(method){ 
        var fn = modelClass[method];
        if( typeof(fn) == 'function'){
            modelClass[method] =  toolbox.bindCallback(modelClass, fn )
        }
    });
    var instanceMethods = "save,remove,populate,update".split(",");
    _.each(instanceMethods, function(method){ 
        var fn = modelClass.prototype[method];
        if( typeof(fn) == 'function'){
            modelClass.prototype[method] =  toolbox.bindCallback(null, fn )
        }
    }); 
}
