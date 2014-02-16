// Angoose main module
//  
//      var angoose = require("angoose");
//      angoose.init(expressApp, { })
//
var ROOT = process.cwd();
var path= require("path"),traverse = require("traverse"),hooks= require("hooks"), Q = require("q");
var fs = require("fs"),logging = require("log4js"), _ =require("underscore");
var ClientSchema = new require("./Schema");
var Pipeline = require('./Pipeline');
  
var pjson = require('../package.json'), toolbox = require("./util/toolbox");
var async = toolbox.async, domain=require("domain");
var logger = logging.getLogger('angoose');
logger.setLevel('INFO');
var domainLogger = logging.getLogger('angoose-domain');
domainLogger.setLevel('INFO');

var DEFAULT_OPTIONS = {
    'core-extensions':['angoose-mongoose'],
    'url-prefix':'/angoose',
    'client-file': ROOT+'/angoose-client-generated.js',
    'module-dirs': './models',
    'mongo-opts':'localhost:27017/test',
    'logging':'INFO'
}
/** Variables */
var options = {};
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
function init(app, conf, force) {
    if(this.initialized && !force) return;
    
    //beans = {};
    
    config(conf);
    
    logger.debug("Initializing Angoose(force: ", force, ") ", options);
    
    /** connect to Mongo if necessary */
    connectMongo(options);
    
    /** register initial hooks */
    registerHooks();        
    
    /** pre-load models/services from directories */
    harvestBeans(options);
    
    /** build client side schemas */
    generateClient();

    /** configure the routes for handling RMI and client loading*/
    /**@todo: middleware*/
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
    if(arguments.length == 0) return null;
    if(arguments.length == 1) return getClass(name);
    if(arguments.length == 2) return registerClass(name, target);
}

function hasModule(name){
    return beans[name] ? true : false; 
}
function getClass(name){
    name = toolbox.camelcase(name);
    if(!beans[name]) throw "Class '"+ name+"' is not found. Check log to see if class is loaded successfully "
    return beans[name];  
}

function registerClass(nameOrOpts, claz){
    var opts = typeof(nameOrOpts) == 'object'?nameOrOpts: {name: nameOrOpts};
    var className = opts.name;
    if(!className) throw "Missing module name: "+ className
    if(beans[className])
        logger.warn("Overriding existing bean: ", className);
    if(claz._angoosemeta && (claz._angoosemeta.baseClass == 'Service' || claz._angoosemeta.baseClass == 'Model') ){
        // already mixed
    }
    else{
        if(typeof(claz) === 'function' && claz.schema  && claz.modelName )
            opts.baseClass = 'Model';
        else if(claz instanceof getMongoose().Schema){
            opts.baseClass = 'Model';
            claz = getMongoose().model(className, claz);
        }
        else
            opts.baseClass = 'Service';
        angoose.Remotable.mixin(opts, claz);
    }
    beans[className] = claz;
    logger.info("Registered ", claz._angoosemeta.baseClass, className);
    return claz;
    // if(claz._angoosemeta && (claz._angoosemeta.baseClass == 'Service' || claz._angoosemeta.baseClass == 'Model') ){
//         
    // }
    // else{
        // throw "Invalid class: must be a Model or Service class: " + claz;
    // }
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
        if(this.mockContext) return this.mockContext
        
        logger.error("getContext called but no active domain", domain.active);
        logger.error("Caller is ",   arguments.callee && arguments.callee.caller && arguments.callee.caller.name, arguments.callee && arguments.callee.caller );
        throw "Context not available. This may happen if the code was not originated by Angoose";  
    } 
    
    return domain.active.context;
} 

function setContext(ctx){
    this.mockContext = ctx;
}
function testContext(name){
    
    if(!domain.active){
        domainLogger.debug("-------------------------------------- TEST-CONTEXT ", name, "NO ACTIVE DOMAIN");
        return;
    }
    if(!domain.active.context){
        domainLogger.debug("---------------------------------------TEST-CONTEXT ", name, "NO CONTEXT in active domain");
        return;
    }
    domainLogger.debug("-------------------------------------- TEST-CONTEXT ", name, "  OK ");
}

// ** defer() **
//
// Convenience wrapper for `Q.defer()`, returns a deferred object
//
function defer(){
    return Q.defer();
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
        var filename = options['client-file'] ;  
        var content = fs.readFileSync(filename , 'ascii');
        res.set('Content-Type', 'application/javascript');
        res.send(200,   content );  
    });
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
    return fn;
}

function scanModelFiles(dirs){
    var dirs = _.isArray(dirs)? dirs: [dirs];
    var files = [];
    files.push(path.resolve( __dirname , '../models/SampleUser.js')); // sample model
    
    function scanDir(dirname){
        if(!dirname ||   dirname.indexOf("node_modules")>=0) return;
        logger.debug("Scanning directory for modules: ", dirname);
        if(fs.existsSync(path.resolve(dirname, 'index.js'))){
            files.push(path.resolve(dirname, 'index.js') );
            return;
        }
        fs.readdirSync( dirname  ).forEach(function(file) {
            var fullpath = path.resolve(dirname,file);
            if(! fs.statSync(fullpath).isFile()) scanDir( fullpath );
            else if (file.match(/.+\.js/g) !== null) {
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
    logger.debug("Harvesting modules")
    var files =  scanModelFiles( options.modelDir || options['module-dirs']);
    files.forEach(function(file) {
            try{
                var claz = require(file);
            }
            catch(ex){
                 logger.error("Skipping file ", file, " due to error: ", ex);
            }
    });   
    logger.debug("Adding all mongoose models");
    _.each(getMongoose().modelNames(), function(modelName){
        if(!hasModule(modelName)){
            registerClass( modelName,  getMongoose().model(modelName));
        } 
    });
};
// ** geneateClient() **
//
// Generates the client file to be served as the contents of resource `/angoose/angoose-client.js` 
function generateClient(){
    var sm = new angoose.Schema();
    var content = "";
    sm.generateClient(beans, options, function(err,filename, fileContent){
        if(err) throw err;
        content += fileContent;
    })
    if(!content) throw("Schema generation failed. Note schema hooks cannot use async callback");
    return content;
}
/**
 * This is mostly used by tests
 */
function getClient(forceGenerate){
    if(!angoose.initialized ||  forceGenerate)
        generateClient();
    return require(options['client-file']);
}
function connectMongo(options){
    var mongoose = getMongoose();
    if(mongoose.connection && mongoose.connection.readyState > 0 ){
        logger.debug("Found Mongoose connection"); 
        return;
    }  
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

function service(nameOpts, proto){
    logger.debug("creating service ", nameOpts, typeof(proto));
    var opts = typeof(nameOpts) == 'string'? {name: nameOpts}: nameOpts;
    if(!opts.name) throw "Service name must be provided.";
    proto = proto || {}; 
    return angoose.Service.extend(proto, opts );
}
function getMongoose(){
    this.mongoose = this.mongoose || options.mongoose;
    if(!this.mongoose){
        try{
            this.mongoose =  module.parent.require('mongoose');
            logger.debug("Mongoose from parent")    
        }
        catch(err){
            logger.debug("No mongoose in parent module");
            this.mongoose = require("mongoose");
        }
        
    }  
    return this.mongoose;
}
function noop(){};

function registerHook(middleware){
    if(!middleware) return;
    var hooks = require("hooks");
    if(typeof(middleware) == 'string'){
        try{
            if(fs.existsSync(path.resolve(__dirname,  "../extensions/"+ middleware+".js"))){
                logger.debug("loading built-in extension", middleware);
                middleware = require("../extensions/"+ middleware);
            }
            else
                middleware = require(middleware);
        }
        catch(err){
            logger.error("Require middleware", middleware, " failed", err);
        }
    }
    if(typeof(middleware)!='object') throw new Error("Angoose middleware is not an object: " + middleware);
    if(!middleware.name) throw new Error("Middleware must have a name");
    var name = middleware.name;
    
    
    Object.keys(middleware).forEach(function(key){
        if(key.indexOf('pre') <0 && key.indexOf("post")<0) return;
        var func = middleware[key]; 
        if(typeof (func)!='function') return;
        
        var hookType = key.indexOf('pre') == 0?  'pre':'post';
        var method = key.substring(hookType.length);
        if(!method) return;
        method = method.substring(0,1).toLowerCase() + method.substring(1)
        
        var target = Pipeline.prototype[method] ? Pipeline: (ClientSchema.prototype[method]?ClientSchema:null);
        if(!target) throw "Invalid extension point: "+ hookType;
        logger.debug("adding hook ", hookType, method) 
        target[hookType](method, func);
    });
    
    logger.info("Registered  Extension", name);
}


function registerHooks(){
    logger.debug("Registering extensions");
    toolbox.removeHookPoints(Pipeline);
    toolbox.removeHookPoints(ClientSchema);
    
    var extensions = options['core-extensions'].concat(   options.hooks || options.extensions || []);
    if(extensions){
        var hooks = Array.isArray(extensions)? extensions:[extensions];
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

function getLogger(name){
    name = name || 'angoose';
    return require("log4js").getLogger(name);
}
function config(conf){
    if(!conf) return options; /**@todo: probably a deep copy */
   
    if(angoose.initialized) throw "Cannot config Angoose after startup";
    
    options = _.extend({}, DEFAULT_OPTIONS);
    /** overrite default configurations */ 
    _.extend(options, conf );
    
    if(conf && conf.urlPrefix)  options['url-prefix'] = conf.urlPrefix;
    if(conf && conf.modelDir)  options['module-dirs'] = conf.modelDir;
    if(conf && conf.mongo_opts)  options['mongo-opts'] = conf.mongo_opts;
    if(conf && conf.clientFile)  options['client-file'] = conf.clientFile;
    
    logger.setLevel( options.logging || 'INFO' );
}

function angoose(){
    return lookupOrRegister.apply(null, arguments)
}
function bootstrap(){
    
    /** statics */
    angoose.Remotable = require("./Remotable");
    angoose.Principal = require("./Principal");
    angoose.Context = require("./Context");
    angoose.Model = require("./Model");
    
    angoose.Schema = require("./Schema");
    
    angoose.init = init;
    angoose.getClass = getClass;
    angoose.getContext = getContext;
    angoose.testContext = testContext;
    angoose.generateClient = generateClient; /** testing only */
    angoose.service = service;
    angoose.getMongoose = getMongoose;
    angoose.rmiAccept = Pipeline.accept; /** for unit test purpose*/
    angoose.setContext = setContext; // for test
    angoose.execute = Pipeline.execute;
    
    /** public API */
    angoose.Model = require("./Model");
    angoose.Service = require("./Service");
    angoose.defer = defer;
    angoose.inContext = inContext;
    angoose.config = config;
    angoose.getLogger = getLogger;
    angoose.hasModule = hasModule;
    /**@since 0.2.13 */
    angoose.bind = inContext;
    angoose.client = getClient;
        
    angoose.module = lookupOrRegister
    
    getMongoose();
}

bootstrap();

module.exports =  angoose;


 
