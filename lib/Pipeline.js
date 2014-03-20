var path= require("path"),traverse = require("traverse"),hooks= require("hooks"), Q = require("q");
var fs = require("fs"),logging = require("log4js"), _ =require("underscore");
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
    
    if(invocation.allowed !== undefined) authorizeBack && authorizeBack();
    /** default implementation always grant access */
    var defaultMode = angoose().config()['authorization-mode'];
    invocation.allowed =  (defaultMode !== 'deny-all');
    authorizeBack && authorizeBack();
}


proto.resolveTarget = function resolveTarget(invocation,  resolveBack){
    logger.debug("STEP 200: pipline.resolveTarget");
    /**logger.debug("Preparing target from JSON");*/

    if(invocation.target){
        logger.debug("Skipping default: resolveTarget");
        return resolveBack();
    } 
    
    if(!invocation.static && typeof(invocation.instance) != 'object') 
        return resolveBack(  new Error("Missing invocation instance property" ));
           
    var modelClass = angoose().getClass( invocation.clazz );
    if(invocation.static){ 
        invocation.target = modelClass;
        return resolveBack();
    }
    
    invocation.target = new modelClass(invocation.instance);
    return resolveBack( ); 
}
 
proto.resolveArguments = function resolveArguments(invocation, resolveArgBack){
    logger.debug("STEP 300: pipline.resolveArguments");         
    //async(resolveArgBack)(false, invocation.args);
    if(invocation.arguments !== undefined){
        logger.debug("Skipping default: resolveArguments");
        return resolveArgBack();
    }
    invocation.arguments = invocation.args;
    resolveArgBack ();
}        

proto.invoke = function invoke(invocation , invokeBack){
    //logger.debug("STEP 400: pipline.invoke");         
    if(invocation.results !== undefined){
        logger.debug("Skipping default: invoke");
        return invokeBack();
    }
    var method =  invocation.method;  
    var seqnum = invocation.seqnumber;
    var target = invocation.target;
    var args = invocation.arguments;
    
    var useCallback  = false;
    
    function callbackHandler(err, result){
        /** converting to Q promise */
        logger.trace("In invoke callback handler #"+seqnum, err);
        if(err){
            logger.debug("Method invocation returned error:", err);
            //return deferred.reject(err);
            err = err instanceof Error? err: new Error(err);
            return invokeBack( err);
        }
        logger.trace("Method invocation result:", result)
        invocation.result = result;
        invokeBack();
    }
    if( invocation.method == 'save' && args.indexOf("$callback")<0  ){
        args.push('$callback'); // hack for now
    }
    
    useCallback =  injectDependencies(target[method], args,  callbackHandler);
    logger.debug("invoking method ",  method, "arguments", args );
    
    if(!target[method]) return invokeBack(new Error('Method '+ method+" is not defined on module "+ invocation.clazz));
    var ret = target[method].apply(target,  args);
    
    logger.trace("invoking result", ret);
    if(ret instanceof Error) return callbackHandler(ret);
    
    if(Q.isPromise(ret) || (ret && typeof(ret.done) == 'function')){
        ret.done(function(result){
            callbackHandler(false, result);
        }, function(err){
            callbackHandler(err);
        }); 
    }
    else if(!useCallback || ret !== undefined) {
        /** if method returns data directly or returned undefined */
        return callbackHandler(false, ret); 
    }
}; /**  end invoke */


proto.redact = function redact(invocation, redactBack){
    logger.debug("STEP 500: pipline.redact");
    if(invocation.redacted !== undefined){
        logger.debug("Skipping default: redact");
        return redactBack();
    }
    invocation.redacted = invocation.result;
    redactBack();
} 

proto.pack = function pack(invocation,  packBack){
    logger.debug("STEP 600: pipline.pack");
    if(invocation.packed !== undefined){
        logger.debug("Skipping default: pack");
        return packBack();
    }
    
    var target = invocation.target;
    var redacted = invocation.redacted;
    var valueType = getValueType(redacted);  /** model, models, object, string*/
    var retdata = { success:true, 
                    exception:null, 
                    retval:redacted,
                    datatype: valueType, 
                    seqnumber:invocation.seqnumber 
    };
    if( !invocation.static && (! _.isEqual(target.toJSON(), invocation.target))) 
    {
        /** return the instance data if it has changed */                        
        retdata.instance = target.toJSON();
    }
    invocation.packed = retdata;
    packBack();    
}

proto.formatError = function formatError(invocation, formatBack){
    if(invocation.packed) return formatBack();
    var ex = invocation.exception;
    ex.invocation = invocation.clazz +"."+ invocation.method;
    ex.seqnumber = invocation.seqnumber;
    invocation.packed = {
         success:false,
         exception:ex,
         seqnumber: invocation.seqnumber
    }
    formatBack();
}
function getValueType(obj){
    if(!obj || typeof(obj) == 'string') return 'string';
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
        ['allowed', 'target', 'arguments','result','redacted'].forEach(function(key){
            delete invocation[key];
        });
    
        var dmain = domain.create();
        dmain.context = ctx;
        //var excutionStorage = storageFactory.createNamespace("angoose");
        /** here comes the main body of the processing */
        dmain.run(function(){
                var pipeline = new Pipeline();
                var seqnum = invocation.seqnumber;
                var sent = false;
                logger.debug("------ BEGIN RMI #", seqnum, invocation.clazz, invocation.method );
                logger.trace("Invocation object: ",invocation);
                //invocation.method = req.params.method;  /** method must be part of the path for routes permission etc */
                ctx.seqnum = seqnum;
                ctx.invocation = invocation;
                 
                function handleError(err, exName){
                    if(sent){
                        logger.debug("Response already sent")
                        return;  
                    } 
                    /**@todo: err may cause Circular issue when converting to JSON */
                    var ex = new Exception(err, exName);
                    invocation.exception = ex;
                    
                    pipeline.formatError(invocation, function(er){
                        logger.debug("====== END RMI with Error  #", seqnum,  ex);
                        callback(invocation.packed);
                        sent  = true;    
                    });
                }
                dmain.on('error',  function uncaught(ex){
                    logger.error("Uncaught error in invocation #"+seqnum, ex);
                    /**@todo: restart server if too many errors */
                    handleError(  "Unexpected Server Error", 'RuntimeError');
                });
                
                /** setting execution context */
                var sent = false;
                 
                var modelName = invocation.clazz;
                var seqnum = invocation.seqnumber;
                //excutionStorage.set("context", ctx);
                pipeline.authorize(invocation,   function(err){
                    if(err) return handleError(err);
                    if(! invocation.allowed) return handleError("Access Denied", "AuthError");
                    
                    pipeline.resolveTarget(invocation,   function(err){
                        if(err) return handleError(err);
                        
                        if(!invocation.target) return handleError("Target not resolved.", "ModuleNotFoundError");
                        
                        pipeline.resolveArguments(invocation,function(err){
                            if(err) return handleError(err);
                            
                            if(!invocation.arguments) return handleError("Arguments not resolved.");
                            pipeline.invoke(invocation, function(ex){
                                
                                if(ex) return handleError(ex);
                                pipeline.redact(invocation, function(err){
                                    if(err) return handleError(err);
                                    pipeline.pack(invocation, function(err){
                                        if(err) return handleError(err);
                                        //res.send(200, packedData);
                                        callback(invocation.packed);
                                        sent = true;    
                                        logger.debug("====== END RMI Succeeded #", seqnum);
                                        if(Array.isArray(invocation.packed && invocation.packed.retval) && invocation.packed.retval.length>0){
                                            logger.trace("Response is an array with length:",  invocation.packed.retval.length, "First element:",invocation.packed.retval[0] );    
                                        }
                                        else logger.trace("Response data is ", invocation.packed);
                                        
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
      
Pipeline.accept = function accept(req, res){
    var invocation = decode(req.body);
    var ctx = new  Context({request:req, response:res} )
    Pipeline.execute(ctx, invocation, function(data){
        // traverse(data).forEach(function(){
            // //if(this.circular) this.remove(); // circular ref will cause JSON.stringify fail
        // });
        res.send(200, data);
    });
}


Pipeline.hookables = 'authorize,resolveTarget,resolveArguments,invoke,redact,pack,formatError'.split(",");
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
