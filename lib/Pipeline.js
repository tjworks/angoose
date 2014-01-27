var path= require("path"),traverse = require("traverse"),hooks= require("hooks"), Q = require("q");
var fs = require("fs"),logging = require("log4js"), _ =require("underscore"), storageFactory = require('continuation-local-storage');
var schemaUtil = require("./Schema") ;
var toolbox = require("./util/toolbox");
var async = toolbox.async;
var logger = logging.getLogger('angoose');




function Pipeline(){}
for (var k in hooks) { Pipeline[k] = hooks[k];}

var proto = Pipeline.prototype;
    
proto.authorize= function authroize(invocation, ctx, authorizeBack){
    logger.debug("STEP 100: pipline.authorize");
    /** default implementation always grant access */
    async(authorizeBack)(false, true);
}


proto.resolveTarget = function resolveTarget(invocation, ctx, resolveBack){
    logger.debug("STEP 200: pipline.resolveTarget");
    /**logger.debug("Preparing target from JSON");*/
    var modelClass = angoose().getClass( invocation.clazz );
    if(invocation.static)
        return resolveBack(false, modelClass);
    if( typeof(invocation.instance) != 'object') 
        return resolveBack(  "Missing invocation instance property" );
    
    if(modelClass instanceof angoose().Service || !invocation.instance._id)
       return resolveBack(false, new modelClass(invocation.instance));
        
    var _id = invocation.instance._id;
    logger.debug("Loading pristine instance as base",invocation.clazz, _id)    
    modelClass.findById(_id,  angoose().inContext(mongoCallback));
    
    function mongoCallback(err, pristineInstance){
       if(err || !pristineInstance){
           logger.error("Failed to load model by id", _id);
           return resolveBack(err);
       }
       var pristineObject = pristineInstance.toObject();
       var schema = modelClass.schema;
       Object.keys(schema.paths).forEach(function(path){
           //var pathSchema = schema.paths[path];
           //var ref = schemaUtil.getReference(pathSchema);
           var newVal = modelClass.getData(invocation.instance, path);
           var oldVal  =  modelClass.getData(pristineObject, path); 
           if(!_.isEqual(oldVal, newVal)){ /**@todo: empty value from client side doesn't mean set to empty, need to implement the $dirty, modified' */
                pristineInstance.set(path,newVal);
                logger.trace("seting", path, ": ",oldVal, " --> ", newVal, " NOW dirty? ",  pristineInstance.isModified(path));
           }
       });
       resolveBack(false, pristineInstance);
    }
    
}
 
proto.resolveArguments = function resolveArguments(invocation, ctx, resolveArgBack){
    logger.debug("STEP 300: pipline.resolveArguments");         
    //async(resolveArgBack)(false, invocation.args);
    resolveArgBack (false, invocation.args);
}        

proto.invoke = function invoke(invocation, ctx , invokeBack){
    logger.debug("STEP 400: pipline.invoke");         
    
    var method =  invocation.method;  
    var seqnum = invocation.seqnumber;
    var target = invocation.target;
    var args = invocation.args;
    
    var callbackDeferred= Q.defer();
    var useCallback  = false;
    
    function checkForModelError(result, target ){
        var err = ( target && target.errors) || (result && result.errors);
        if(err)
        { 
            var ex = { value: err, code:500, message:""};
            Object.keys(err).forEach(function (errItem) {
                ex.message += ex.message?";":"";
                ex.message += err[errItem].message; 
            })
            ex.message = ex.message || err.toString();
            return ex.message; /**@todo: return error objects */
        }
    }
    
    function callbackHandler(err, result){
        /** converting to Q promise */
        logger.trace("In invoke callback handler #"+seqnum, err);
        if(err){
            logger.error("error exuecuting Model method", err);
            //return deferred.reject(err);
            invokeBack(err);
        }
        logger.trace("Model method ret", result)
        
        function waitForModelError(){
            /** the model error is emitted in next tick */
            var ex = checkForModelError(result, (invocation.isStaitc?null:target) );
            if(ex) return invokeBack ( ex );
            invokeBack(false, result)    
        }
        process.nextTick(  waitForModelError )
    }
    
    useCallback =  injectDependencies(target[method], args, ctx, angoose().inContext(callbackHandler));
    logger.debug("invoking method ",  method.toUpperCase() , " with arguments", args, " on target ", target)
  
    var ret = target[method].apply(target,  args);
    
    if(ret instanceof Error) return callbackHandler(ret);
    
    if(ret && ret.exec && (ret instanceof angoose().getMongoose().Query) ){ // mongoose promise
        logger.debug("Return value is mongoose query, call exec()" ); 
        ret.exec(angoose().inContext(callbackHandler));
        return;
    }
    if(useCallback) return;
    
    if(Q.isPromise(ret)){
       ret.done(function(result){
            callbackHandler(false, result);
        }, function(err){
            callbackHandler(err);
        }); 
    }
    else {
        /** if method returns data directly or returned undefined */
        return callbackHandler(false, ret); 
    }
        
    
    
       
             
}; /**  end invoke */


proto.redact = function redact(invocation, ctx, invocationResult, redactBack){
    logger.debug("STEP 500: pipline.redact");
    redactBack(false, invocationResult);
} 

proto.pack = function pack(invocation, ctx, result,  packBack){
    logger.debug("STEP 600: pipline.pack");
    var target = invocation.target;
    var valueType = getValueType(result);  /** model, models, object, string*/
    var retdata = { success:true, 
                    exception:null, 
                    retval:result,
                    datatype: valueType, 
                    seqnumber:invocation.seqnumber 
    };
    if( !invocation.static && (! _.isEqual(target.toJSON(), invocation.target))) 
    {
        /** return the instance data if it has changed */                        
        retdata.instance = target.toJSON();
    }
    //debugger;
    packBack(false, retdata)    
}



function getValueType(obj){
    if(!obj || typeof(obj) == 'string') return 'string';
    if( obj.schema && obj.schema.paths && obj.schema.methods ) return 'model';
    if( obj.length ){
        for(var i =0; obj && obj.length>i; i++){
            var retval =  getValueType(obj[i]);
            if(retval != 'model') return 'object'
        }
        return 'models';    
    }
    return 'object';
}
//hookIt('authorize', proto.authorize);

function injectDependencies(func, args, ctx, callback ){
    
    var declaredArguments = schemaUtil.parseDeclaredArguments(func);
    declaredArguments = declaredArguments.replace(/\s+/g, "").split(",");
    logger.trace("injectDependencies() declaredArguments: ", declaredArguments, "provided args:", args);
    var useCallback = false;
    var len = args.length > declaredArguments.length? args.length:declaredArguments.length;
    for(var i=0;i< len ;i++){ // this is problematic: functions may be wrapped and lost the arguments data
        /** if client did not provide enough number of arguments, we fill it with null*/
        if(typeof( args[i]) == 'undefined')
            args[i] = undefined;
        else if(args[i] === "$callback"){
            useCallback = true;    
            args[i] = callback;        
        }
        switch(declaredArguments[i]){
            case '$callback':
                logger.debug("Injecting callback handler");
                args[i] = callback;
                useCallback = true;
                break;
             case '$context':
                logger.debug("Injecting angoose context");
                args[i] = ctx;
                break;
             default:
                break; 
        } 
    } 
    return useCallback;
}

function angoose(){
    return require("./angoose");
}


for (var k in hooks) { Pipeline[k] = hooks[k];}
   
Pipeline.hook('authorize', proto.authorize);
Pipeline.hook('resolveTarget', proto.resolveTarget);
Pipeline.hook('resolveArguments', proto.resolveArguments);
Pipeline.hook('invoke', proto.invoke);
Pipeline.hook('redact', proto.redact);
Pipeline.hook('pack', proto.pack);


module.exports =  Pipeline;


