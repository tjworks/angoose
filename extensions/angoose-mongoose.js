var angoose = require("../lib/angoose");
var toolbox = require("../lib/util/toolbox");
var EXTENSION = 'angoose-mongoose';
var path= require("path"),traverse = require("traverse"),hooks= require("hooks"), Q = require("q");
var fs = require("fs"),  _ =require("underscore");

toolbox.patchMongoCallback();

var plugin = {
    postResolveTarget: postResolveTarget,
    postInvoke: postInvoke,
    postPack: postPack,
    postExportModule: decorateMongooseSchema,
    afterFormatError: formatError
};
module.exports = angoose.extension('MongooseExtension', plugin);

function formatError(next, invocation){
    var ex = invocation.packed.exception;
    console.log("Intercepting error", ex);
    // check if it's mongoose's model error
    var errors = toolbox.getter(ex , 'cause.errors');
    if( errors){
        // format model error
        var msg = '';
        Object.keys(errors).forEach(function(key){
            var errobj = errors[key];
            var m = errobj.message+"";
            msg = msg+m+" " 
        });
        ex.message = msg;
    }
    next();
};

function decorateMongooseSchema(  client, moduleName){
    var model = angoose.module(moduleName);
    if(!model.schema || !model.schema.paths) return;
    logger().trace("Decorating mongoose model", moduleName);
    
    var schema = client.schemas[moduleName];
    // automatically publish these instance methods
    var instanceMethods = "save,remove,populate";
    instanceMethods.split(",").forEach(function(m){
        m = m.replace(/\s+/g, '');
        if(!schema.methods[m]) 
            schema.methods[m]= function remote(){};     
    });
    
    // automatically publish these static methods
    var staticMethods = "populate,find,findOne,findById,findByIdAndRemove,findByIdAndUpdate,findOneAndRemove,findOneAndUpdate,update,remove,count,geoNear,geoSearch,create";
    staticMethods.split(",").forEach(function(m){
        m = m.replace(/\s+/g, '');
        if(!schema.statics[m])
            schema.statics[m]= function remote(){};     
    });
    
    schema.paths = traverse(model.schema.paths).map(function(item){
        if(!item) return;
        if(item.options && typeof(item.options.type) === 'function' ){
            var fn = item.options.type;
            item.options.type = fn.name || fn.toString();                
        }
        else if(typeof(item) == 'function')
            this.update( 'not-supported' );
        if(item.requiredValidator) delete item.requiredValidator;
        if(item.enumValidator) delete item.enumValidator;
        if(item.validators) delete item.validators; /**@todo validators are not supported yet*/
    }); 
    schema.options = traverse( model.schema.options).clone();
//    filtPaths(schema);
}
function filtPaths(schema){
    traverse(schema).forEach(function(item){
        if((this.parent&&this.parent.parent&&this.parent.parent.key=='paths')
                ||(this.parent&& (this.parent.isRoot || this.parent.key == 'schema')))
        {
            if(_.indexOf(['moduleName','methods','statics','paths','enumValues','isRequired','schema','caster','path','options','instance'],this.key)<0){
                this.remove();
            }
        }
    })
}

function logger(){
    var logger = angoose.getLogger('angoose'); return logger;
}

function postResolveTarget(next, invocation){
    if(!invocation.target || invocation.static || ! invocation.instance || !invocation.instance._id ) return next();
    logger().debug("postResolveTarget for mongoose models");
        
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
           if (/^_/.test(path)) return;
           //var pathSchema = schema.paths[path];
           //var ref = schemaUtil.getReference(pathSchema);
           if (/^_/.test(path)) return;
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
    
    if(result && result.exec && (result instanceof angoose.getMongoose().Query) ){ // mongoose promise
        logger().debug("Return is mongoose query, call exec(). Conditions: ", result._conditions );
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
        if(ex){
            logger().debug("Detected model error", ex);
            return next(ex);
        } 
        next();  
    });
      
}; /**  end invoke */

function postPack(next, invocation){
    //console.log("In mongoose post pack", invocation)
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
