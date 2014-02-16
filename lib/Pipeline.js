var path= require("path"),traverse = require("traverse"),hooks= require("hooks"), Q = require("q");
var fs = require("fs"),logging = require("log4js"), _ =require("underscore");
var AngooseSchema = new require("./Schema");
var schemaUtil = new AngooseSchema();  
var domain = require("domain");
var toolbox = require("./util/toolbox");
var async = toolbox.async;
var logger = logging.getLogger('angoose');
var Context = require("./Context");
var Exception = require("./Exception");

/**@todo: move to mongoose plugin */
toolbox.patchMongoCallback();

function Pipeline(){}
for (var k in hooks) { Pipeline[k] = hooks[k];}

var proto = Pipeline.prototype;
    
proto.authorize= function authroize(invocation, authorizeBack){
    logger.debug("STEP 100: pipline.authorize");
    /** default implementation always grant access */
    var defaultMode = angoose().config()['authorization-mode'];
    if(defaultMode == 'deny-all')
        async(authorizeBack)(false, false );
    else 
        async(authorizeBack)(false, true );
    //async(authorizeBack)(false, defaultMode == 'deny-all');
}


proto.resolveTarget = function resolveTarget(invocation,  resolveBack){
    logger.debug("STEP 200: pipline.resolveTarget");
    /**logger.debug("Preparing target from JSON");*/
    var modelClass = angoose().getClass( invocation.clazz );
    if(invocation.static)
        return resolveBack(false, modelClass);
    if( typeof(invocation.instance) != 'object') 
        return resolveBack(  new Error("Missing invocation instance property" ));
    
    if(modelClass instanceof angoose().Service )
       return resolveBack(false, new modelClass(invocation.instance));
        
    var _id = invocation.instance && invocation.instance._id;
    logger.debug("Loading pristine instance as base",invocation.clazz, _id)
    if(_id)
        modelClass.findById(_id,   mongoCallback);
    else
        mongoCallback(false, new modelClass());
    
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
           if(!path || path.indexOf("_") == 0) return;
           var newVal = toolbox.getter(invocation.instance, path);
           var oldVal  =  toolbox.getter(pristineObject, path); 
           if(!_.isEqual(oldVal, newVal) &&  newVal !==  undefined ){ /**@todo: empty value from client side doesn't mean set to empty, need to implement the $dirty, modified' */
                if(newVal == '$CLEAR$') newVal = null;
                pristineInstance.set(path,newVal);
                logger.trace("seting", path, ": ",oldVal, " --> ", newVal, " NOW dirty? ",  pristineInstance.isModified(path));
           }
       });
       resolveBack(false, pristineInstance);
    }
    
}
 
proto.resolveArguments = function resolveArguments(invocation, resolveArgBack){
    logger.debug("STEP 300: pipline.resolveArguments");         
    //async(resolveArgBack)(false, invocation.args);
    resolveArgBack (false, invocation.args);
}        

proto.invoke = function invoke(invocation , invokeBack){
    logger.debug("STEP 400: pipline.invoke");         
    
    var method =  invocation.method;  
    var seqnum = invocation.seqnumber;
    var target = invocation.target;
    var args = invocation.args || [];
    
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
            logger.debug("Model method returned error", err);
            //return deferred.reject(err);
            err = err instanceof Error? err: new Error(err);
            invokeBack( err);
        }
        logger.trace("Model method ret", result)
        
        function waitForModelError(){
            /** the model error is emitted in next tick */
            var ex = checkForModelError(result, (invocation.static?null:target) );
            if(ex){
                ex = ex instanceof Error? ex: new Error(ex);
                return invokeBack ( ex );
            } 
            invokeBack(false, result)    
        }
        process.nextTick(  waitForModelError )
    }
    if( invocation.method == 'save' && args.indexOf("$callback")<0  ){
        args.push('$callback'); // hack for now
    }
    useCallback =  injectDependencies(target[method], args, ctx,  callbackHandler );
    
<<<<<<< HEAD
=======
    useCallback =  injectDependencies(target[method], args,  callbackHandler);
>>>>>>> c967152... relocated execute to pipeline
    logger.debug("invoking method ",  method );
    logger.trace("invoking arguments",   args, " on target ", target)
    
    if(!target[method]) return invokeBack(new Error('Method '+ method+" is not defined on module "+ invocation.clazz));
    var ret = target[method].apply(target,  args);
    
    logger.trace("invoking result", ret);
    if(ret instanceof Error) return callbackHandler(ret);
    
    if(ret && ret.exec && (ret instanceof angoose().getMongoose().Query) ){ // mongoose promise
        logger.debug("Return value is mongoose query, call exec()" ); 
        ret.exec( callbackHandler );
        return;
    }
    
    
    if(Q.isPromise(ret) || (ret && typeof(ret.done) == 'function')){
       ret.done(function(result){
            callbackHandler(false, result);
        }, function(err){
            err = err instanceof Error? err: new Error(err);
            callbackHandler(err);
        }); 
    }
    //if(useCallback) return;
    else if(!useCallback || ret !== undefined) {
        /** if method returns data directly or returned undefined */
        return callbackHandler(false, ret); 
    }
}; /**  end invoke */


proto.redact = function redact(invocation, invocationResult, redactBack){
    logger.debug("STEP 500: pipline.redact");
    redactBack(false, invocationResult);
} 

proto.pack = function pack(invocation, result,  packBack){
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

function injectDependencies(func, args, callback ){
    
    var declaredArguments = toolbox.parseDeclaredArguments(func);
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
                args[i] = angoose().getContext();
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


/**
 * Main execution method
 * 
 * @param invocation Invocation object
 */
Pipeline.execute = function(ctx, invocation, callback){
        var dmain = domain.create();
        dmain.context = ctx;
        //var excutionStorage = storageFactory.createNamespace("angoose");
        /** here comes the main body of the processing */
        dmain.run(function(){
                var pipeline = new Pipeline();
                var seqnum = invocation.seqnumber;
                var sent = false;
                logger.debug("====== BEGIN RMI #", seqnum, invocation.clazz, invocation.method );
                logger.trace("Invocation object: ",invocation);
                //invocation.method = req.params.method;  /** method must be part of the path for routes permission etc */
                ctx.seqnum = seqnum;
                ctx.invocation = invocation;
                 
                function handleError(err, exName){
                    /**@todo: err may cause Circular issue when converting to JSON */
                    var ex = new Exception(err, exName);
                    var ret = {
                         success:false,
                         exception:ex,
                         seqnumber: seqnum
                    }
                    logger.debug("====== END RMI with Error  #", seqnum,  ex);
                    callback(ret);
                    sent  = true;
                }
                dmain.on('error',  function uncaught(ex){
                    logger.error("Uncaught error in invocation #"+seqnum, ex);
                    /**@todo: restart server if too many errors */
                    handleError(  "Unexpected Server Error #"+seqnum, 'RuntimeError');
                });
                
                /** setting execution context */
                var sent = false;
                 
                var modelName = invocation.clazz;
                var seqnum = invocation.seqnumber;
                //excutionStorage.set("context", ctx);
                pipeline.authorize(invocation,   function(err, allowed){
                    if(err) return handleError(err);
                    logger.debug("authorized: ", allowed);
                    if(!allowed) return handleError("Access Denied");
                    
                    pipeline.resolveTarget(invocation,   function(err, target){
                        if(err) return handleError(err);
                        
                        if(!target) return handleError("Unable to resolve target");
                        invocation.target = target;
                        
                        pipeline.resolveArguments(invocation,function(err, args){
                            if(err) return handleError(err);
                            invocation.args = args;
                            pipeline.invoke(invocation, function(ex, invocationResult){
                                
                                if(ex) return handleError(ex);
                                pipeline.redact(invocation, invocationResult, function(err, redactionResult){
                                    if(err) return handleError(err);
                                    pipeline.pack(invocation,   redactionResult, function(err, packedData){
                                        if(err) return handleError(err);
                                        //res.send(200, packedData);
                                        callback(packedData);
                                        sent = true;    
                                        logger.debug("====== END RMI Succeeded #", seqnum);
                                        logger.trace("Response data", packedData);
                                    });    
                                });
                            });    
                        });
                    });
                });
                /** catch the strayed handling, returns error in 5 seconds if response not sent */
               var tmout = setTimeout(function(){
                   if(sent) return;
                   
                   var msg = "Timeout occurred when processing call "+invocation.clazz +"." + invocation.method;
                   logger.error(msg,  seqnum);
                   handleError(msg);
                   //res.send(200, packError( {message: msg, value: msg, code:500 }, invocation.seqnumber ));
               }, angoose().config().request_timeout || 5000);
               tmout.unref();
               
        });/** end context closure */ 
}
      
Pipeline.accept = function rmiAccept(req, res){
    var invocation = decode(req.body);
    var ctx = new  Context({request:req, response:res} )
    Pipeline.execute(ctx, invocation, function(data){
        res.send(200, data);
    });
}


Pipeline.hookables = 'authorize,resolveTarget,resolveArguments,invoke,redact,pack'.split(",");
toolbox.addHookPoints(Pipeline);
module.exports =  Pipeline;




function decode(obj){
    /** due to Angular HTTP library's stupidity, keys starting with $ are ignored. hence _mongo_$ to work around this*/
    if(!obj || typeof obj != 'object') return obj;
    if(Array.isArray(obj)){
        for(var i=0;i<obj.length;i++){
            obj[i] = decode(obj[i]);
        };
    }
    else{
        Object.keys(obj).forEach(function(key){
            var val = decode(obj[key]);
            if(key.indexOf('_mongo_$')==0){
                delete obj[key];
                key = key.substring(7)
            }
            obj[key] = val;
        })
    }
    return obj;
}
