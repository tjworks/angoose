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
}
function noop(){};

var configs = DEFAULT_CONFIG;
var logger = logging.getLogger('angoose');
logger.debug("====== Bootstraping Angoose", pjson.version);
var connectMongo = function(){
    try{
        if(!mongoose.connection)
            mongoose.connect( configs.mongo_opts ); //@todo: handle complex connection options    
    }
    catch(err){
        logger.debug("mngoose connection error", err)
    }
}
var serverObj = {}
serverObj.dataType = function(obj){
    if(!obj || typeof(obj) == 'string') return 'string';
    if( obj.schema && obj.schema.paths && obj.schema.methods ) return 'model';
    if( obj.length ){
        for(var i =0; obj && obj.length>i; i++){
            var retval =  serverObj.dataType(obj[i]);
            if(retval != 'model') return 'object'
        }
        return 'models';    
    }
    return 'object';
}
serverObj.init = function  (app, conf) {
    _.extend(configs, conf );
    logger.debug("Initializing Angoose ", configs);
    initilizeModels(configs);
    //@todo: prefix
    app && app.post(configs.urlPrefix+"/rmi/:model/:method", function(req,res){
        var invocation = req.body;
        var modelName = req.params['model'];
        var method = req.params['method'] || invocation.method;  // method may be specified as part of the data object
        try{
            var modelClass = serverObj.model(modelName);
            
            var target= invocation.static? modelClass : new modelClass(invocation.instance); 
            logger.debug("====== RMI Call #", invocation.seqnumber, invocation);
            var ret = target[method].apply(target, invocation.args || []);
            if(ret && ret.exec){ // mongoose promise
                logger.debug("Converting mongoose promise!",   invocation.args);
                var deferred = Q.defer();
                ret.exec(function(err, data){
                    if(err){
                        console.error("error exuecuting Model method", err);
                        return deferred.reject(err);
                    }
                    logger.debug("Model method res", data)
                    deferred.resolve( data);
                });
                ret = deferred.promise;
            }
            else
                ret = Q(ret); // if method returns data directly
            ret.done(function(result){
                var datatype = serverObj.dataType(result);  // model, models, object, string
                var retdata = { success:true, 
                                exception:null, 
                                retval:result,
                                datatype: datatype, 
                                seqnumber:invocation.seqnumber 
                };
                if( !invocation.static && (! _.isEqual(target.toJSON(), invocation.target))) 
                {
                    // return the instance data if it has changed                        
                    retdata.instance = target.toJSON();
                    logger.trace("Changed items", target.toJSON())
                }
                res.send(200, retdata);
                logger.debug("====== RMI Call #", invocation.seqnumber, " DONE: ", retdata);
            }, function(err){
                logger.error("====== RMI Call #", invocation.seqnumber, " Failed: ", err);
                res.send(200, {success:false, exception:{message: err.toString(), value:err, code:500 }, seqnumber:invocation.seqnumber } );
            });    
        }
        catch(err){
            logger.error("Unhandled server error", err)
            res.send(200, {success:false, exception:{message: err.toString(), value:err, code:501 }, seqnumber:invocation.seqnumber });
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

function initilizeModels(configs){
    serverObj.models = {};
    //@todo: modelDir can be array, use path()
    var dirname =  configs.modelDir;
    try{
        serverObj.models['SampleUser'] =  require(path.resolve( __dirname , '../models/SampleUser'));
        logger.debug("Loaded sample model");    
    }
    catch(err){
        logger.debug("Failed to load sample models", err)
    }
    
    fs.readdirSync( dirname  ).forEach(function(file) {
        if (file.match(/.+\.js/g) !== null && file !== 'index.js') {
            var name = file.replace('.js', '');
            try{
                var model = require( path.resolve(dirname , file));
                
                if(typeof(model) === 'function' && model.schema  && model.modelName ){
                    serverObj.models[model.modelName] = model;
                    logger.debug("Loaded model",model.modelName)
                }
                else{
                    logger.debug("Skip non-mongoose model", model)   
                }
            }
            catch(ex){
                 logger.debug("Skipping file ", file, " due to error: ", ex);
            }
        }
    });   
    var schemas = ''
    // generate client side schemas
    _.each(serverObj.models, function(model, modelName){
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

serverObj.model = function(modelName){
    if(!serverObj.models)
        initilizeModels(configs);
    if(!serverObj.models[modelName]) throw "Unable to find model "+modelName +" in these directories: "+configs.modelDir
    return serverObj.models[modelName];  
}
module.exports = serverObj;
