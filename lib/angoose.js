// Angoose main module
//  
//      var angoose = require("angoose");
//      angoose.init(expressApp, { })
//
//
var path= require("path"),traverse = require("traverse"),hooks= require("hooks"), Q = require("q");
var fs = require("fs"),logging = require("log4js"), _ =require("underscore");
var schemaUtil = require("./Schema"), pjson = require('../package.json'), toolbox = require("./util/toolbox");
var async = toolbox.async, domain=require("domain");
var logger = logging.getLogger('angoose');
var Pipeline = null;

var DEFAULT_OPTIONS = {
    'url-prefix':'/angoose',
    clientFile:  path.resolve( require("os").tmpdir(), 'angoose-client-generated.js'),
    'module-dirs': './models',
    serviceDir: './services',
    'mongo-opts':'localhost:27017/test'
}
/** Variables */
var options = null;
var beans = {}; /** this holds all Angoose classes*/

// ### API References

// ** init(app, options) **
//
// Initialize Angoose. This function should be called in the express app
//  
// * @app: Express app, for now
// * @options: Angoose settings:
//     - module-dirs, optional, default to ./models
//     - url-prefix, optional, default to /angoose
//     - mongo-opts, optional. Provide this if you want Angoose to make the connection 
// 
function init(app, conf) {
    if(this.initialized) return;
    
    /**@todo: middleware*/
    options = _.extend({}, DEFAULT_OPTIONS);
    /** overrite default configurations */ 
    _.extend(options, conf );
    beans = {};
    if(conf && conf.urlPrefix)  options['url-prefix'] = conf.urlPrefix;
    if(conf && conf.modelDir)  options['module-dirs'] = conf.modelDir;
    if(conf && conf.mongo_opts)  options['mongo-opts'] = conf.mongo_opts;
    
    logger.debug("Initializing Angoose ", options);
    
    /** reload Pipeline */ 
    Pipeline = reload("./Pipeline");
        
    /** register initial hooks */
    registerHooks();        
    
    /** connect to Mongo if necessary */
    connectMongo(options);
    
    
    /** pre-load models/services from directories */
    harvestBeans(options);
    
    /** build client side schemas */
    generateClient();

    /** configure the routes for handling RMI and client loading*/
    configureRoutes(app, options);   
  
    this.initialized = true;  
} 
 
// ** module(name, function_or_object) **
//
// Retrieve an Angoose module or register one
//
// If only one argument, name is provided, returns the registered module with that name. This form is same as `angoose.getClass()`
//
// If two arguments are provided, register the function/object as Angular module under that name.
//

function lookupOrRegister(name, target){
    switch(arguments.length){
        case 0: throw new Error("No arguments");
        case 1: // given a module name
            return getClass(name);
        case 2: // register a service
            this.Remotable.mixin(target);
            registerClass(name, target);
            return target;
    }
}

// ** getContext() **
//
// Returns the current execution context. 
//  
// This methods returns a Context object which allows you to get a reference to the current request object 
// and/or login user's Principal object. If the callee isn't inside Angoose execution context, an error will 
// be thrown. See [Context](Context.html) for more.
function getContext(){
    
    if(!domain.active || !domain.active.context){
        logger.error("getContext called but no active domain", domain.active)
        throw "Context not available. This may happen if the code was not originated by Angoose";  
    } 
    
    return domain.active.context;
} 


// ** defer() **
//
// Convenience wrapper for `Q.defer()`, returns a deferred object
//
function defer(){
    return Q.defer();
}
 
 
function registerClass(className, claz){
    if(!className) throw "Invalid module name: "+ className
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
    app.post(options['url-prefix']+"/rmi/:model/:method", rmiAccept);
    /** @todo: use static serving to enable cache //app.get("/angoose/AngooseClient.js", express.static(options.clientFile)); */
    app.get(options['url-prefix']+"/angoose-client.js", function(req, res){
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
    

function formatError (ex, seqnumber){
    logger.debug("====== END RMI with Error  #", seqnumber,  ex);
    return {success:false, exception:ex, seqnumber: seqnumber };
}


//** bind(func) **
//
// Bind the async callback function with the active domain so we dont' lose the context.
//
// Necessary for Mongoose (and maybe other async modules) callbacks. 
//      
function inContext(fn){
    /** there is a known issue with CLS that it does not work with MongoDB, 
     * needs to bind the callback with the CLS context 
     * https://github.com/othiym23/node-continuation-local-storage/issues/6
     * */
    if(domain.active) return domain.active.bind(fn);
    // var namespace = storageFactory.getNamespace("angoose"); 
    // return namespace.bind(fn);
}


function rmiAccept(req,res){
        var dmain = domain.create();
        var ctx = dmain.context = new angoose.Context({request:req, response:res} )
        //var excutionStorage = storageFactory.createNamespace("angoose");
        /** here comes the main body of the processing */
        dmain.run(function(){
                var pipeline = new Pipeline();
                var invocation = decode(req.body);
                var seqnum = invocation.seqnumber;
                var sent = false;
               
                
                logger.debug("====== BEGIN RMI #", seqnum, invocation.clazz, invocation );
                invocation.method = req.params.method;  /** method must be part of the path for routes permission etc */
                ctx.seqnum = seqnum;
                ctx.invocation = invocation;
                
                function handleError(err, formated){
                     res.send(200,  formated || formatError( {message: err.toString(), value:err, code:500 }, ctx.seqnum  ));
                     sent  = true;
                }
                dmain.on('error',  function uncaught(ex){
                    logger.error("Uncaught error", ex);
                    /**@todo: restart server if too many errors */
                    handleError(true, formatError({ message: ex.toString(), value:ex, code:501}, ctx.seqnum));
                });
                
                /** setting execution context */
                var sent = false;
                 
                var modelName = invocation.clazz;
                var seqnum = invocation.seqnumber;
                //excutionStorage.set("context", ctx);
                
                pipeline.authorize(invocation, ctx,  inContext( function(err, allowed){
                    if(err) return handleError(err);
                    logger.debug("authorized: ", allowed);
                    if(!allowed) return handleError("Access Denied");
                    
                    pipeline.resolveTarget(invocation, ctx, inContext(function(err, target){
                        if(err) return handleError(err);
                        
                        if(!target) return handleError("Unable to resolve target");
                        invocation.target = target;
                        
                        pipeline.resolveArguments(invocation, ctx, inContext(function(err, args){
                            if(err) return handleError(err);
                            invocation.args = args;
                            pipeline.invoke(invocation, ctx , inContext(function(ex, invocationResult){
                                if(ex) return handleError(ex);
                                pipeline.redact(invocation, ctx, invocationResult, inContext(function(err, redactionResult){
                                    if(err) return handleError(err);
                                    pipeline.pack(invocation, ctx, redactionResult, inContext(function(err, packedData){
                                        if(err) return handleError(err);
                                        res.send(200, packedData);
                                        sent = true;    
                                        logger.debug("====== END RMI Success Result #", seqnum, " DONE: ", packedData);
                                    }));    
                                }))
                            }));    
                        }))
                    }))
                }));
                /** catch the strayed handling, returns error in 5 seconds if response not sent */
               var tmout = setTimeout(function(){
                   if(sent) return;
                   
                   var msg = "Timeout occurred when processing call "+invocation.clazz +"." + invocation.method;
                   logger.error(msg,  seqnum);
                   handleError(msg);
                   //res.send(200, formatError( {message: msg, value: msg, code:500 }, invocation.seqnumber ));
               }, options.request_timeout || 5000);
               tmout.unref();
               
        });/** end context closure */ 
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
    var files =  scanModelFiles( options.modelDir || options['module-dirs']);
    files.forEach(function(file) {
            var filename = file.replace(/.*[\/\\]([a-z0-9_]+)\.js/i, "$1");
            try{
                var modelClaz = require( file );
                if(modelClaz && modelClaz._angoosemeta){
                    /** Angoose classes */
                    var name = modelClaz._angoosemeta.name || filename;
                    //registerClass(name, modelClaz)
                }
                else if(typeof(modelClaz) === 'function' && modelClaz.schema  && modelClaz.modelName ){
                    /** mongoose model */
                    logger.debug("Adpating mongoose model to Angoose model", modelClaz.modelName)
                    if(!beans[modelClaz.modelName]){
                        modelClaz = angoose.Model.extend(modelClaz)                           
                        registerClass(modelClaz.modelName, modelClaz);
                        //modelClaz.on('error', modelErrorHandler);    
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
    content = content.replace("/**CONFIG_PLACEHOLDER*/", '"urlPrefix":"'+ options['url-prefix']+'"');  
    /**  include client specific extensions*/
    var clientModuleFile = require("path").resolve(__dirname , "client/angoose-angular.js");
    content += fs.readFileSync(clientModuleFile, 'ascii');
    clientModuleFile = require("path").resolve(__dirname , "client/angoose-jquery.js");
    content += fs.readFileSync(clientModuleFile, 'ascii');
    clientModuleFile = require("path").resolve(__dirname , "client/angoose-node.js");
    content += fs.readFileSync(clientModuleFile, 'ascii');
    
    if(output.indexOf("/")>=0){
        var outputDir = output.replace(/^(.*)\/[^\/]+$/, "$1");
        if(outputDir && !fs.existsSync){
            logger.debug("Creating dir", outputDir)
            fs.mkdirSync(outputDir);    
        }
    }
    fs.writeFileSync(output, content);
    logger.debug("Generated the client file: "+ options.clientFile);
    return content;       
}
function connectMongo(options){
    var mongoose = getMongoose();
    try{
        logger.debug("Connecting to mongodb", options.mongo_opts || options['mongo-opts'])
        mongoose.connect( (options.mongo_opts || options['mongo-opts']) , function(err){
            if(err) logger.debug("Error connecting to Mongo:", err)
            else logger.debug("Connected to MongoDB")
        }); /**@todo: handle complex connection options*/
        //mongoose.connection.on('error', console.error.bind(console, 'connection error:'));
    }
    catch(err){
        logger.debug("mngoose connection error", err)
    }
}

function modelErrorHandler(err, obj){
    logger.error("Dummy Model.on() error handler", err, obj);
}

function service(nameOpts, proto){
    logger.debug("creating service ", nameOpts, typeof(proto));
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

function registerHook(middleware){
    if(!middleware) return;
    var hooks = require("hooks");
    if(typeof(middleware)!='object') throw "Angoose middleware must be an object";
    if(!middleware.name) throw "Middleware must have a name";
    var name = middleware.name;
    logger.info("Registering middleware ", name);
    
    Object.keys(middleware).forEach(function(key){
        if(key.indexOf('pre') <0 && key.indexOf("post")<0) return;
        var func = middleware[key]; 
        if(typeof (func)!='function') return;
        
        
        var hookType = key.indexOf('pre') == 0?  'pre':'post';
        var method = key.substring(hookType.length);
        if(!method) return;
        method = method.substring(0,1).toLowerCase() + method.substring(1)
        logger.debug("adding hook ", hookType, method) 
        Pipeline[hookType](method, func);
    });
}

function getClass(name){
    if(!beans)
        harvestBeans(options);
    if(!beans[name]) throw "Class '"+ name+"' is not found. Check log to see if class is loaded successfully "
    return beans[name];  
}

function compile(next){
    process.nextTick(function(){
        console.log("process.next:  compile");
        next && next()
    })
}
function registerHooks(){
    if(options.hooks){
        var hooks = Array.isArray(options.hooks)? options.hooks: [ options.hooks ]
        _.each(hooks, function(hook){
            // unregister first 
            registerHook(hook);
        })
    }
}
function reload(module){
    var name = require.resolve(module);
    delete require.cache[name];
    return require(module);
}

function angoose(){
    return lookupOrRegister.apply(null, arguments)
}
function bootstrap(){
    
    //toolbox.patchQ();
    /** statics */
    angoose.Remotable = require("./Remotable");
    angoose.Principal = require("./Principal");
    angoose.Context = require("./Context");
    angoose.Model = require("./Model");
    
    angoose.init = init;
    angoose.getClass = getClass;
    angoose.getContext = getContext;
    angoose.registerClass  = registerClass;
    angoose.generateClient = generateClient; /** testing only */
    angoose.service = service;
    angoose.getMongoose = getMongoose;
    angoose.rmiAccept = rmiAccept; /** for unit test purpose*/
    angoose.compile = compile; /** unit test */
    
    /** public API */
    angoose.Model = require("./Model");
    angoose.Service = require("./Service");
    angoose.defer = defer;
    angoose.inContext = inContext;
    /**@since 0.2.13 */
    angoose.bind = inContext;
    
    angoose.module = lookupOrRegister
}

bootstrap();

module.exports =  angoose;


 
