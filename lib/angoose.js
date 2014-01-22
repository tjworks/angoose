
// Angoose main module
//  
//      var angoose = require("angoose");
//      angoose.init(expressApp, { })
//
//
var path= require("path");
var traverse = require("traverse")
var Q = require("q");
var fs = require("fs");
var logging = require("log4js");
var _ =require("underscore");
var storageFactory = require('continuation-local-storage');

var schemaUtil = require("./Schema");
var pjson = require('../package.json');
var DEFAULT_OPTIONS = {
    urlPrefix:'/angoose',
    clientFile:  path.resolve( require("os").tmpdir(), 'angoose-client-generated.js'),
    modelDir: './models',
    serviceDir: './services',
    mongo_opts: 'localhost:27017/test'
}
/** Variables */
var options = DEFAULT_OPTIONS;
var logger = logging.getLogger('angoose');
var beans = {}; /** this holds all Angoose classes*/
var angoose = {};

logger.debug("====== Bootstraping Angoose", pjson.version);

/** statics */
angoose.Remotable = require("./Remotable");
angoose.Principal = require("./Principal");
angoose.Context = require("./Context");
angoose.Model = require("./Model");
angoose.Service = require("./Service");


// ### API References

// ** init(app, options) **
//
// Initialize Angoose. This function should be called in the express app
//  
// * @app: Express app, for now
// * @options: Angoose settings:
//     - modelDir, optional, default to ./models
//     - serviceDir, optional, default to ./services
//     - urlPrefix, optional, default to /angoose
//     - mongo_opts, optional. Provide this if you want Angoose to make the connection 
// 
function init(app, conf) {
    /**@todo: middleware*/
    
    /** overrite default configurations */ 
    _.extend(options, conf );
    
    logger.debug("Initializing Angoose ", options);
    
    /** add hook for pre query */
    setupQueryHook();
    
    /** connect to Mongo if necessary */
    connectMongo(options);
    
    /** pre-load models/services from directories */
    harvestBeans(options);
    
    /** build client side schemas */
    generateClient();
    
    /** configure the routes for handling RMI and client loading*/
    configureRoutes(app, options);   
    
} 
 
// ** getClass(name) **
//
// Get the model or service class so you can instantiate it or call methods on them.
//
// The return value is either a [Model](Model.html) class or [Service](Service.html) class

function getClass(name){
    if(!beans)
        harvestBeans(options);
    if(!beans[name]) throw "Class '"+ name+"' is not found. Check log to see if class is loaded successfully "
    return beans[name];  
}

// ** getContext() **
//
// Returns the current execution context. 
//  
// This methods returns a Context object which allows you to get a reference to the current request object 
// and/or login user's Principal object. If the callee isn't inside Angoose execution context, an error will 
// be thrown. See [Context](Context.html) for more.
function getContext(){
    var storage = storageFactory.getNamespace('angoose');
    var ctx = storage.get("context");
    if(!ctx) throw "Context is not available. This may happen if the execution was not orginated by Angoose"
    return ctx;
}

// ** defer() **
//
// Convenience wrapper for `Q.defer()`, returns a deferred object
//
function defer(){
    return Q.defer();
}

// ** registerClass(className, claz) **
// 
// Register a Remotable class with Angoose. Used internally
//
// Parameters:
// - className: name to register the class under
// - claz: the class to register, must be Model or Service
// 
function registerClass(className, claz){
    
    if(beans[className]){
        logger.warn("Overriding existing bean: ", className);
    }
    if(claz._angoosemeta && (claz._angoosemeta.baseClass == 'Service' || claz._angoosemeta.baseClass == 'Model') ){
        beans[className] = claz;
        logger.info("===== Registered ", claz._angoosemeta.baseClass, className);
    }
    else{
        throw "Invalid class: must be a Model or Service class: " + claz;
    }
}
function configureRoutes(app, options){
    if(!app){
        logger.warn("app not provided, RMI functionality is disabled");   
        return;
    }
    /** this is the main RMI endpoint */
    app.post(options.urlPrefix+"/rmi/:model/:method", rmiAccept);
    /** @todo: use static serving to enable cache //app.get("/angoose/AngooseClient.js", express.static(options.clientFile)); */
    app.get(options.urlPrefix+"/angoose-client.js", function(req, res){
        logger.debug("Handling AngooseClinet.js load request");
        var filename = options.clientFile ;  
        var content = fs.readFileSync(filename , 'ascii');
        res.set('Content-Type', 'application/javascript');
        res.send(200,   content );  
    });
}

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
function formatError (ex, seqnumber){
    logger.debug("====== END RMI with Error  #", seqnumber,  ex);
    return {success:false, exception:ex, seqnumber: seqnumber };
}

function injectDependencies(func, args, ctx, callback ){
    
    var declaredArguments = schemaUtil.parseDeclaredArguments(func);
    declaredArguments = declaredArguments.replace(/\s+/g, "").split(",");
    logger.trace("injectDependencies() declaredArguments: ", declaredArguments, "provided args:", args);
    var useCallback = false;
    for(var i=0;i<declaredArguments.length;i++){
        /** if client did not provide enough number of arguments, we fill it with null*/
        if(typeof( args[i]) == 'undefined')
            args[i] = undefined;
        else
            continue;    
        switch(declaredArguments[i]){
            case '$callback':
                logger.debug("Injecting callback handler");
                args[i] = callback;
                useCallback = true;
                break;
             case '$context':
                logger.debug("Injecting context");
                args[i] = ctx;
                break;
             default:
                break; 
        } 
    }
    return useCallback;
}

function rmiAccept(req,res){
    
        var invocation = decode(req.body);
        invocation.method = req.params.method;  /** method must be part of the path for routes permission etc */
        /** setting execution context */
        var ctx = new angoose.Context({request:req, response:res, session:req.session});
        var excutionStorage = storageFactory.createNamespace("angoose");
        excutionStorage.run(function(){
            logger.debug("Setting execution context");
            var sent = false;
            excutionStorage.set("context", ctx);
            try {
                processInvocation(invocation, ctx, function(ex, data){
                    if(ex)
                        data = data || formatError({message:ex.toString(), value:ex, code:500}, invocation.seqnumber ) ;
                    res.send(200, data);
                    sent = true;
                });    
            }
            catch(err){
                res.send(200, formatError( {message: err.toString(), value:err, code:500 }, invocation.seqnumber ));
                sent = true;
            }
            /** catch the strayed handling, returns error in 5 seconds if response not sent */
           setTimeout(function(){
               if(sent) return;
               var msg ="Timeout occurred when processing call "+invocation.clazz +"." + invocation.method;
               logger.error(msg, invocation.seqnumber);
               res.send(200, formatError( {message: msg, value: msg, code:500 }, invocation.seqnumber ));
           }, options.request_timeout || 5000);
        });/** end context closure */
}
function processInvocation(invocation, ctx, sendResponse){         
        var modelName = invocation.clazz;
        var method =  invocation.method;  
        var seqnum = invocation.seqnumber;
        logger.debug("====== BEGIN RMI #", seqnum, modelName, invocation );
        
        
        var callbackDeferred= Q.defer();
        var useCallback  = false;
        function callbackHandler(err, result){
            /** converting to Q promise */
            logger.trace("In callback handler #"+seqnum, err, result);
            if(err) callbackDeferred.reject(err);
            else callbackDeferred.resolve(result);
        }
        var args = _.map(invocation.args || [], function(item){
            if(item === "$callback"){
                useCallback = true;
                return callbackHandler;
            } 
            return item;
        });
        
        var modelClass = getClass(modelName);
        var modelError = null;
        
        prepareTarget(invocation, function(target){
            if(typeof(target) == 'string') /** error */
                return sendResponse( formatError( {message: err.toString(), value:err, code:500 }, seqnum ) );
            invokeMethod(target);
        })
        
           
       function invokeMethod(target){
            try{
                useCallback = useCallback || injectDependencies(target[method], args, ctx, callbackHandler);
                logger.trace("invoking method ",  method.toUpperCase() , " with arguments", args, " on target ", target)
              
                var ret = target[method].apply(target,  args);
                if(ret && ret.exec && (ret instanceof getMongoose().Query) ){ // mongoose promise
                    logger.debug("Return value is mongoose query, call exec()" ); 
                    var deferred = Q.defer();
                    ret.exec(function(err, data){
                        if(err){
                            logger.error("error exuecuting Model method", err);
                            return deferred.reject(err);
                        }
                        logger.debug("Model method res", data)
                        deferred.resolve( data);
                    });
                    ret = deferred.promise;
                }
                else if(Q.isPromise(ret)){
                    /** nothing to do */
                }
                else if(useCallback){
                    /** method requested callback handler*/
                    ret = callbackDeferred.promise;
                }
                else {
                    /** if method returns data directly or returned undefined */
                    ret = Q(ret); 
                }
                    
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
                        return ex;
                    }
                }
                
                ret.done(function(result){
                    var ex = checkForModelError(result, (invocation.isStaitc?null:target) );
                    if(ex) return sendResponse ( ex );
                    var valueType = getValueType(result);  /** model, models, object, string*/
                    var retdata = { success:true, 
                                    exception:null, 
                                    retval:result,
                                    datatype: valueType, 
                                    seqnumber:seqnum 
                    };
                    if( !invocation.static && (! _.isEqual(target.toJSON(), invocation.target))) 
                    {
                        /** return the instance data if it has changed */                        
                        retdata.instance = target.toJSON();
                    }
                    sendResponse(false, retdata);
                    logger.debug("====== END RMI Success Result #", seqnum, " DONE: ", retdata);
                }, function(err){
                    sendResponse(  err );
                });    
            }
            catch(err){
                logger.error("Unhandled server error", err)
                sendResponse(true, formatError(   {message: err.toString(), value:err, code:501 },  seqnum ));
            }
        };
}; /**  end processRMI */


function prepareTarget(invocation, targetCallback){
    logger.debug("Preparing target from JSON");
    var modelClass = getClass( invocation.clazz );
    if(invocation.static)
        return targetCallback(modelClass);
    if( typeof(invocation.instance) != 'object') 
        return targetCallback(  "Missing invocation instance property" );
    
    if(modelClass instanceof angoose.Service || !invocation.instance._id)
       return targetCallback(new modelClass(invocation.instance));
        
    var _id = invocation.instance._id;
    logger.debug("Loading pristine instance as base",invocation.clazz, _id)    
    modelClass.findById(_id, function(err, pristineInstance){
       if(err || !pristineInstance){
           logger.error("Failed to load model by id", _id);
           return targetCallback(err);
       }
       var pristineObject = pristineInstance.toObject();
       var schema = modelClass.schema;
       Object.keys(schema.paths).forEach(function(path){
           //var pathSchema = schema.paths[path];
           //var ref = schemaUtil.getReference(pathSchema);
           var newVal = modelClass.getData(invocation.instance, path);
           var oldVal  =  modelClass.getData(pristineObject, path); 
           if(!_.isEqual(oldVal, newVal)){
                pristineInstance.set(path,newVal);
                logger.trace("seting", path, ": ",oldVal, " --> ", newVal, " NOW dirty? ",  pristineInstance.isModified(path));
           }
       });
       targetCallback(pristineInstance);
    });
         
}

function scanModelFiles(dirs){
    var dirs = _.isArray(dirs)? dirs: [dirs];
    var files = [];
    files.push(path.resolve( __dirname , '../models/SampleUser.js')); // sample model
    
    function scanDir(dirname){
        logger.debug("Scanning directory for models: ", dirname);
        fs.readdirSync( dirname  ).forEach(function(file) {
            var fullpath = path.resolve(dirname,file);
            if(! fs.statSync(fullpath).isFile()) scanDir( fullpath );
            else if (file.match(/.+\.js/g) !== null && file !== 'index.js') {
                files.push(fullpath);
            }
        });
    }
    dirs.forEach(function(dirname){
        scanDir(dirname);
    });
    return files;
}

function harvestBeans(options){
    logger.debug("Initialzing models")
    var files =  scanModelFiles( options.modelDir);
    files.forEach(function(file) {
            var filename = file.replace(/.*[\/\\]([a-z0-9_]+)\.js/i, "$1");
            try{
                var modelClaz = require( file );
                if(modelClaz && modelClaz._angoosemeta){
                    /** Angoose classes */
                    var name = modelClaz._angoosemeta.name || filename;
                    registerClass(name, modelClaz)
                }
                else if(typeof(modelClaz) === 'function' && modelClaz.schema  && modelClaz.modelName ){
                    /** mongoose model */
                    logger.debug("Adpating mongoose model to Angoose model", modelClaz.modelName)                           
                    modelClaz = angoose.Model.extend(modelClaz)                           
                    registerClass(modelClaz.modelName, modelClaz);
                    var clz = getClass(modelClaz.modelName);
                    if(!clz || clz !== modelClaz){
                        /** only register once */
                        modelClaz.on('error', modelErrorHandler);   
                    }
                }
                else{
                    logger.debug("Skip non-Angoose class file", filename)   
                }
            }
            catch(ex){
                 logger.debug("Skipping file ", filename, ".js due to error: ", ex);
            }
    });   
};
// ** geneateClient() **
//
// Generates the client file to be served as the contents of resource `/angoose/angoose-client.js` 
function generateClient(){
    var schemas = ''
    /** generate client side schemas*/
    _.each(beans, function(model, modelName){
            logger.debug("Generating client schema for model ", modelName);
            var tmp = modelName + ":" + schemaUtil.stringify( modelName, model );
            schemas = (schemas? (schemas+","):"") + tmp;
    });
    var template = require("path").resolve(__dirname , "client/angoose-client.js");
    
    var output = options.clientFile ;  
    var content = fs.readFileSync(template , 'ascii');
    content = content.replace("/**SCHEMA_PLACEHOLDER*/", schemas);
    /** angoose options */
    content = content.replace("/**CONFIG_PLACEHOLDER*/", '"urlPrefix":"'+ options.urlPrefix+'"');  
    /**  include client specific extensions*/
    var clientModuleFile = require("path").resolve(__dirname , "client/angoose-angular.js");
    content += fs.readFileSync(clientModuleFile, 'ascii');
    clientModuleFile = require("path").resolve(__dirname , "client/angoose-jquery.js");
    content += fs.readFileSync(clientModuleFile, 'ascii');
    clientModuleFile = require("path").resolve(__dirname , "client/angoose-node.js");
    content += fs.readFileSync(clientModuleFile, 'ascii');
    fs.writeFileSync(output, content);
    logger.debug("Generated the client file: "+ options.clientFile);
    return content;       
}
function connectMongo(options){
    var mongoose = getMongoose();
    try{
        logger.debug("Connecting to mongodb", options.mongo_opts)
        mongoose.connect( options.mongo_opts , function(err){
            logger.debug("Mongoose connection", arguments);
        }); /**@todo: handle complex connection options*/
        mongoose.connection.on('error', console.error.bind(console, 'connection error:'));
    }
    catch(err){
        logger.debug("mngoose connection error", err)
    }
}

function modelErrorHandler(err, obj){
    logger.trace("Dummy Model.on() error handler", err, obj);
}

function service(nameOpts, proto){
    logger.debug("creating service ", nameOpts);
    var opts = typeof(nameOpts) == 'string'? {name: nameOpts}: nameOpts;
    if(!opts.name) throw "Service name must be provided.";
    proto = proto || {}; 
    return angoose.Service.extend(proto, opts );
}
function getMongoose(){
    angoose.mongoose = angoose.mongoose || options.mongoose || require("mongoose");
    return angoose.mongoose;
}
function noop(){};

function setupQueryHook(){
    console.log("Setting up query hooks! ")
    var mongoose = getMongoose();
    var origExec = mongoose.Query.prototype.exec;
    mongoose.Query.prototype.exec = function(){
        console.log("pre hook!", this._conditions)
        /**@todo: proper hook*/
        traverse(this._conditions).forEach(function (val) {
            if(typeof(val) == 'string' && val.length == 24 && this.key && this.key.indexOf( '_id')>=0)
                this.update(  new mongoose.Types.ObjectId(val) );
        });
        origExec.apply(this, arguments)
    }
    
}

angoose.init = init;
angoose.getClass = getClass;
angoose.getContext = getContext;
angoose.registerClass  = registerClass;
angoose.generateClient = generateClient;
angoose.service = service;
angoose.getMongoose = getMongoose;
angoose.rmiAccept = rmiAccept; /** for unit test purpose*/
angoose.defer = defer;
module.exports =  angoose;