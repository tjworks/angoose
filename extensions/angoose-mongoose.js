var angoose = require("../lib/angoose");
var toolbox = require("../lib/util/toolbox");
var EXTENSION = 'angoose-mongoose';

var path= require("path"),traverse = require("traverse"),hooks= require("hooks"), Q = require("q");
var fs = require("fs"),  _ =require("underscore");


toolbox.patchMongoCallback();

module.exports = {
    name: EXTENSION,
    postResolveTarget: postResolveTarget,
    postInvoke: postInvoke,
    postPack: postPack
};

function debug(){
    var logger = angoose.getLogger(EXTENSION);
    logger.debug.apply(logger, arguments);
    // var extensionOptions = angoose.config()[EXTENSION] ;
    // angoose.getLogger(EXTENSION).setLevel((extensionOptions && extensionOptions.logging) || 'INFO');
    // return angoose.getLogger(EXTENSION);
}
function logger(){
    var logger = angoose.getLogger(EXTENSION); return logger;
}



/**@todo: move to mongoose plugin */

function postResolveTarget(next, invocation){
    if(!invocation.target || invocation.static || ! invocation.instance || !invocation.instance._id ) return next();
    debug("postResolveTarget for mongoose models");
        
    var _id = invocation.instance._id;
    logger().trace("Loading pristine instance as base",invocation.clazz, _id);
    var modelClass = angoose.module(invocation.clazz);
    modelClass.findById(_id,   function mongoCallback(err, pristineInstance){
       if(err || !pristineInstance){
           logger().error("Failed to load model by id", _id);
           return next(err);
       }
       var pristineObject = pristineInstance.toObject();
       var schema = modelClass.schema;
       Object.keys(schema.paths).forEach(function(path){
           //var pathSchema = schema.paths[path];
           //var ref = schemaUtil.getReference(pathSchema);
           var newVal = toolbox.getter(invocation.instance, path);
           var oldVal  =  toolbox.getter(pristineObject, path); 
           if(!_.isEqual(oldVal, newVal) &&  newVal !==  undefined ){ /**@todo: empty value from client side doesn't mean set to empty, need to implement the $dirty, modified' */
                if(newVal == '$CLEAR$') newVal = null;
                pristineInstance.set(path,newVal);
                logger().trace("seting", path, ": ",oldVal, " --> ", newVal, " NOW dirty? ",  pristineInstance.isModified(path));
           }
       });
       invocation.target = pristineInstance;
       next();
    });
}

function postInvoke (next, invocation){
    var result = invocation.result;
    logger().debug("postInvoke for mongoose");
    if(result && result.exec && (result instanceof angoose.getMongoose().Query) ){ // mongoose promise
        logger().debug("Return value is mongoose query, call exec()" ); 
        result.exec( function(err, ret){
            if(err) return next(err);
            invocation.result = ret;
            next();    
        });
        return;
    }
    
    function checkForModelError(result ){
        var target = invocation.static ? null : invocation.target;
        var err = ( target && target.errors) || (result && result.errors);
        if(err)
        {
            // temp error handling
            var msg = ''; 
            Object.keys(err).forEach(function (errItem) {
                msg += ex.message?"; ":"";
                msg += err[errItem].message; 
            })
            msg = msg || err.toString();
            return msg; 
        }
    }
    
    process.nextTick(function waitForModelError(){
        /** the model error is emitted in next tick */
        var ex = checkForModelError(result);
        if(ex) return next(ex);
        next();  
    });
      
}; /**  end invoke */

function postPack(next, invocation){
    console.log("In mongoose post pack", invocation)
    if(!invocation.redacted) return next();
    var type = getValueType(invocation.redacted);
    if(type) invocation.packed.datatype = type;
    next();
}
 
function getValueType(obj){
    if( obj.schema && obj.schema.paths && obj.schema.methods ) return 'model';
    if(Array.isArray( obj )){
        if(obj.length && getValueType(obj[0]) == 'model') return "models";
    }
    return null;
}
