var path= require("path");
var Q = require("q");
var fs = require("fs");
var logging = require("log4js");
var _ =require("underscore");
var mongoose = require("mongoose");

var DEFAULT_CONFIG = {
    uriPrefix:'/angoose',
    clientFile:  path.resolve( require("os").tmpdir(), 'angoose-client.js'),
    modelDir: './models',
    mongo_opts: 'localhost:27017/test',
    mongoose_portable:['find', 'findOne', 'populate']
}
function noop(){};

var configs = DEFAULT_CONFIG;
var logger = logging.getLogger('angoose');
logger.setLevel(logging.levels.DEBUG);
logger.debug("====== Bootstraping Angoose!");
var parseDeclaredArguments = function(value){
    if(value && typeof value === "string"  && value.substr(0,8) == "function") {
        var startArgs = value.indexOf('(') + 1;
        var endArgs = value.indexOf(')');
        return  value.substring(startArgs, endArgs)
    }
    return null;
}
var stringifySchema = function(modelName, model){
    var funcs = {};
    var count = 0;
    var pattern = /@angoose-method-(portable|server)/i;
    var ret = JSON.stringify( model.schema, function (key, value) {
           if (typeof value !== 'function') return value;
           if(typeof key == 'number' || key == '0') return value;
           var body =  value.toString();
           if(body.indexOf("[native code]")>0) return null;
           logger.trace("#####  Function",key)
           var args = parseDeclaredArguments(body);
           var lookupKey = "FUNCTION-NUMBER-"+ (count++);
           var proxyBody =  "function(" + args+"){/**@angoose-stub*/  return this.angoose$(this,'"+key+"', arguments)}";
           if(configs.mongoose_portable.indexOf(key)>=0) {
                funcs[lookupKey] = body;
                return lookupKey;
           }
           var matcher;
           if(matcher = pattern.exec(body)){
               logger.debug("method type:", matcher[1]);
               var methodType = matcher[1];
               if(methodType === 'server' ){
                   funcs[lookupKey] = proxyBody;
               }
               else
                    funcs[lookupKey] = body;
               return lookupKey;
           }
           else{
               return null;
           }
    });
    for(var lookupKey in funcs){
        ret = ret.replace( '"'+  lookupKey + '"', funcs[lookupKey]);
    }
    ret =  ret.replace(/:/g, ":\r\n"); 
    return ret;
}    

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
serverObj.init = function  (app, conf) {
    _.extend(configs, conf );
    serverObj.initilizeModels(configs);
    //@todo: prefix
    app && app.post(configs.urlPrefix+"/rmi/:model/:method", function(req,res){
        var data = req.body;
        var modelName = req.params['model'];
        var method = req.params['method'] || data.method;  // method may be specified as part of the data object
        var modelClass = serverObj.getModel(modelName);
        //var modelClass = mongoose.model(modelName);
        
        try{
            var target=null;
            if(typeof(data.target) == 'string'){
                // this is a static method of the model class
                target = modelClass; 
            }
            else{
                // this is an instance method
                target =  new modelClass(data.target);
            }
            logger.debug("====== RMI Call #", data.seqnumber, " Start: target=",modelName, ", method=", method, ", args=",  data.args);
            logger.trace("====== original state  ", data.target);
            var ret = target[method].apply(target, data.args || []);
            if(ret && !Q.isPromise(ret)){ // mongoose promise
                logger.debug("Converting mongoose promise!",   data.args);
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
            ret = Q(ret); // if method returns data directly
            ret.done(function(result){
                var retdata = {success:true, exception:null, data:result, seqnumber:data.seqnumber}
                if( typeof(target) == 'object' && (! _.isEqual(target.toJSON(), data.target))) 
                {
                    // return the instance data if it has changed                        
                    retdata.target = target;    
                    logger.trace("Changed items", target.toJSON())
                }
                res.send(200, retdata);
                logger.debug("====== RMI Call #", data.seqnumber, " Succeeded: ", result);
                logger.trace("====== Return data ", retdata );
            }, function(err){
                logger.error("====== RMI Call #", data.seqnumber, " Failed: ", err);
                res.send(200, {success:false, exception:{message: err, code:500 }, seqnumber:data.seqnumber } );
            });    
        }
        catch(err){
            logger.debug("server invocation err2", err)
            res.send(200, {success:false, exception:{message: err.toString(), code:500 } });
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

serverObj.initilizeModels = function(configs){
    serverObj.models = {};
    //@todo: modelDir can be array, use path()
    var dirname =  configs.modelDir;
    logger.debug("Loading sample model");
    serverObj.models['SampleUser'] =  require(path.resolve( __dirname , 'examples/SampleUser'));
    
    logger.debug("Loading models from ", dirname)
    fs.readdirSync( dirname  ).forEach(function(file) {
        if (file.match(/.+\.js/g) !== null && file !== 'index.js') {
            var name = file.replace('.js', '');
            try{
                var model = require( path.resolve(dirname , file));
                if(typeof(model) === 'function' && model.schema && model.schema.paths && name =='User'){
                    serverObj.models[name] = model;
                    logger.debug("Loaded model", name)
                }
            }
            catch(ex){
                console && logger.debug("Unable to load file ", file, ". Error: ", ex);
            }
        }
    });   
     
    var schemas = ''
    // generate client side schemas
    _.each(serverObj.models, function(model, modelName){
            logger.debug("Generating client schema for model ", modelName);
            var tmp = modelName + ":" + stringifySchema( modelName, model );
            schemas = (schemas? (schemas+","):"") + tmp;
    });
    var template = require("path").resolve(__dirname , "client/angoose-client-template.js");
    
    var output = configs.clientFile ; //@todo: tmp file
    var content = fs.readFileSync(template , 'ascii');
    content = content.replace("/**SCHEMA_PLACEHOLDER*/", schemas);
    // include client specific extensions
    var clientModuleFile = require("path").resolve(__dirname , "client/angoose-angular.js");
    content += fs.readFileSync(clientModuleFile, 'ascii');
    clientModuleFile = require("path").resolve(__dirname , "client/angoose-node.js");
    content += fs.readFileSync(clientModuleFile, 'ascii');
    
    fs.writeFileSync(output, content);
    logger.debug("Generated the client file: "+ configs.clientFile);   
}        
serverObj.getModel= function(modelName){
    if(!serverObj.models)
        serverObj.initilizeModels(configs);
    if(!serverObj.models[modelName]) throw "Unable to find model "+modelName +" in these directories: "+configs.modelDir
    return serverObj.models[modelName];       
}

serverObj.model = function(){
    logger.debug("creating model", arguments[0]);
    return mongoose.model.apply(mongoose, arguments);
}
module.exports = serverObj;

/**
 * 
    app && app.get("/angoose/model/:modelName", function(req,res){
        logger.debug("loading model", req.body, req.params['modelName']);
        var data = req.body;
        data.tm = new Date();
        var modelName = req.params['modelName'];
        var ret = serverObj.stringifySchema(modelName);
        ret = JSON.parse(ret);
        res.send(200, {success:true, message:"", code:200, data: ret } );    
    });
    */
