var path= require("path");
var Q = require("q");
var fs = require("fs");
var logging = require("log4js");
var _ =require("underscore");
var mongoose = require("mongoose");
var schemaUtil = require("./schemas");
var pjson = require('../package.json');
var DEFAULT_CONFIG = {
    urlPrefix:'/angoose',
    clientFile:  path.resolve( require("os").tmpdir(), 'angoose-client-generated.js'),
    modelDir: './models',
    serviceDir: './services',
    mongo_opts: 'localhost:27017/test'
    //httpPort:80 // non-standard http port used by client
}
function noop(){};

var configs = DEFAULT_CONFIG;
var logger = logging.getLogger('angoose');
logger.debug("====== Bootstraping Angoose", pjson.version);
var connectMongo = function(){
    try{
        mongoose.connect( configs.mongo_opts ); //@todo: handle complex connection options
        mongoose.connection.on('error', console.error.bind(console, 'connection error:'));
    }
    catch(err){
        logger.debug("mngoose connection error", err)
    }
}

var models = null;

var AngooseContext = function(req){
    this.req = req;
}

var modelErrorHandler = function(err, obj2){
    logger.trace("Dummy Model.on() error handler", err);
}

var getValueType = function(obj){
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
var sendError = function(ex, seqnumber,res){
    logger.debug("====== RMI Erro Result #", seqnumber,  ex);
    res.send(200, {success:false, exception:ex, seqnumber: seqnumber });
}

var injectDependencies = function(func, args, req, callback ){
    
    var declaredArguments = schemaUtil.parseDeclaredArguments(func);
    declaredArguments = declaredArguments.replace(/\s+/g, "").split(",");
    logger.trace("injectDependencies() declaredArguments: ", declaredArguments);
    var useCallback = false;
    for(var i=0;i<declaredArguments.length;i++){
        // if client did not provide enough number of arguments, we fill it with null
        if(typeof( args[i]) == 'undefined')
            args[i] = undefined;
        else
            continue;    
        switch(declaredArguments[i]){
            case '$context':
                logger.debug("Injecting context dependency");
                var ctx = new AngooseContext(req);
                args[i] = ctx;
                break;        
            case '$callback':
                logger.debug("Injecting callback handler");
                args[i] = callback;
                useCallback = true;
                break;
             default: 
                break;
        } 
    }
    return useCallback;
}
var init = function  (app, conf) {
    connectMongo();
    _.extend(configs, conf );
    logger.debug("Initializing Angoose ", configs);
    initilizeModels(configs);
    mongoose.connection.once('open', function(){
            
    });
    
    app && app.post(configs.urlPrefix+"/rmi/:model/:method", function(req,res){
        var invocation = req.body;
        var modelName = req.params['model'];
        var method = req.params['method'] || invocation.method;  // method may be specified as part of the data object
        var seqnum = invocation.seqnumber;
        logger.debug("====== RMI Invocation #", seqnum, invocation );
        
        var args = _.map(invocation.args || [], function(item){ return item});
        
        var callbackDeferred= Q.defer();
        function callbackHandler(err, result){
            // converting to Q promise
            logger.trace("In callback handler #"+seqnum, err, result);
            if(err) callbackDeferred.reject(err);
            else callbackDeferred.resolve(result);
        }
        
        try{
            var modelClass = model(modelName);
            var modelError = null;
            var target= invocation.static? modelClass : new modelClass(invocation.instance);
            
            var useCallback = injectDependencies(target[method], args, req, callbackHandler);
            
            var ret = target[method].apply(target,  args);
            if(ret && ret.exec){ // mongoose promise
                //logger.debug("Converting mongoose promise!",   invocation.args);
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
            else if(useCallback){
                // method requested callback handler
                ret = callbackDeferred.promise;
            }
            else {
                // if method returns data directly or returned undefined
                ret = Q(ret); 
            }
                
            function checkForModelError(result, target, res){
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
                var ex = checkForModelError(result, (invocation.isStaitc?null:target), res);
                if(ex) return sendError( ex, seqnum , res );
                var valueType = getValueType(result);  // model, models, object, string
                var retdata = { success:true, 
                                exception:null, 
                                retval:result,
                                datatype: valueType, 
                                seqnumber:seqnum 
                };
                if( !invocation.static && (! _.isEqual(target.toJSON(), invocation.target))) 
                {
                    // return the instance data if it has changed                        
                    retdata.instance = target.toJSON();
                    logger.trace("Changed items", target.toJSON())
                }
                res.send(200, retdata);
                logger.debug("====== RMI Success Result #", seqnum, " DONE: ", retdata);
            }, function(err){
                sendError( {message: err.toString(), value:err, code:500 }, seqnum  ,res);
            });    
        }
        catch(err){
            logger.error("Unhandled server error", err)
            sendError(   {message: err.toString(), value:err, code:501 },  seqnum ,res);
        }
    });
    
    //@todo: use static serving to enable cache
    //app.get("/angoose/AngooseClient.js", express.static(configs.clientFile));
    app && app.get(configs.urlPrefix+"/angoose-client.js", function(req, res){
        logger.debug("Handling AngooseClinet.js load request");
        var filename = configs.clientFile ;  
        var content = fs.readFileSync(filename , 'ascii');
        res.set('Content-Type', 'application/javascript');
        res.send(  content );  
    });
} 
function scanModelFiles(dirs){
    var dirs = _.isArray(dirs)? dirs: [dirs];
    var files = [];
    files.push(path.resolve( __dirname , '../models/SampleUser')); // sample model
    
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

function initilizeModels(configs){
    
    //@todo: modelDir can be array, use path()
    var files =  scanModelFiles( configs.modelDir);
    models = {};    
    files.forEach(function(file) {
            try{
                var model = require( file );
                if(typeof(model) === 'function' && model.schema  && model.modelName ){
                    models[model.modelName] = model;  //@ non mongoose model
                    //@todo augment models in a separate file 
                    if(!model.$context)
                        model.on('error', modelErrorHandler);
                    model.$context = model.prototype.$context = function(args){
                        for(var i in args){
                            if(args[i] instanceof AngooseContext) return args[i];
                        }
                    };
                    
                    logger.debug("==== Loaded model",model.modelName)
                }
                else{
                    logger.debug("Skip non-mongoose model", file)   
                }
            }
            catch(ex){
                 logger.debug("Skipping file ", file, " due to error: ", ex);
            }
    });   
    var schemas = ''
    // generate client side schemas
    _.each(models, function(model, modelName){
            logger.debug("Generating client schema for model ", modelName);
            var tmp = modelName + ":" + schemaUtil.stringify( modelName, model );
            schemas = (schemas? (schemas+","):"") + tmp;
    });
    var template = require("path").resolve(__dirname , "client/angoose-client.js");
    
    var output = configs.clientFile ; //@todo: tmp file
    var content = fs.readFileSync(template , 'ascii');
    content = content.replace("/**SCHEMA_PLACEHOLDER*/", schemas);
    // configs
    content = content.replace("/**CONFIG_PLACEHOLDER*/", '"urlPrefix":"'+ configs.urlPrefix+'"');  
    // include client specific extensions
    var clientModuleFile = require("path").resolve(__dirname , "client/angoose-angular.js");
    content += fs.readFileSync(clientModuleFile, 'ascii');
    clientModuleFile = require("path").resolve(__dirname , "client/angoose-node.js");
    content += fs.readFileSync(clientModuleFile, 'ascii');
    
    fs.writeFileSync(output, content);
    logger.debug("Generated the client file: "+ configs.clientFile);   
};

function model(modelName){
    if(!models)
        initilizeModels(configs);
    if(!models[modelName]) throw "Unable to find model "+modelName +" in these directories: "+configs.modelDir
    return models[modelName];  
}

module.exports = {
    init:init,
    model:model
}
