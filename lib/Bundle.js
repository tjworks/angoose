var logger = require("log4js").getLogger("angoose"), path=require("path"), fs=require("fs");
var _ =require("underscore");
var toolbox = require("./util/toolbox");
var traverse  = require("traverse");

function Bundle(){}
Bundle.initHooks = initHooks;

var hooks = {};
function initHooks(){
    hooks.pre = {};
    hooks.post = {};
    ['generateClient','configClient','exportModules','exportModule','createBundle'].forEach(function(name){
        hooks.pre[name] = [];           
        hooks.post[name] = [];
    })
}

// synchronous hooks

function addHook(loc, method, func){
    var tmp = hooks[loc][method];
    logger.debug("ADdding bundle hook to", loc, method, tmp );
    if(!tmp) return false;
    tmp.push(func);
    return true;
}
Bundle.pre = function(method, func){
    return addHook('pre', method, func)
}
Bundle.post = function(method, func){
    return addHook('post', method, func)
}

function invokeHook(loc, method, arg1, arg2){
    //console.log("***** Bundle.invokeHook ******* ", loc, method)
    var funcs = hooks[loc][method] || []
    funcs.forEach(function(func){
        logger.trace("calling hook", loc, method, func.name);
        func.call(null, arg1, arg2);
    });
}



function angoose(){
    return require("./angoose");
}
//AngooseSchema.prototype =   {
    //stringify: stringify,
    //parseDeclaredArguments:toolbox.parseDeclaredArguments,
    //getReference:getReference,
    //getFunctionName: getFunctionName
//};
var proto = Bundle.prototype;  
/**
 * prepare the schema for the module
 * 
 * @param {String} moduleName
 * @param {Object} module
 */
proto.exportModule = function(client, moduleName){
    invokeHook('pre', 'exportModule', client, moduleName);
    
    logger.trace("in exportModule", moduleName);
    if(client.schemas[moduleName]) return; // already handled
    var mod = angoose().module(moduleName);
    var schema = toolbox.exportModuleMethods(moduleName, mod);
    if(!schema) logger.error("Module", moduleName, " has no schema, export failed", mod);
    else client.schemas[moduleName] = schema;
    
    invokeHook('post', 'exportModule', client, moduleName);
};

proto.exportModules = function(client){
    invokeHook('pre', 'exportModules', client);
    
    logger.debug("Exporting all modules");
    client.schemas = client.schemas || {};
    var me = this;
   
    var names = angoose().moduleNames();
    var total = names && names.length;
    if(!total) return;
   
    names.forEach(function(moduleName){
        var mod = angoose().getClass(moduleName);
        if(mod.config && mod.config("visibility") === 'local') return;
        
        me.exportModule(client, moduleName); 
       
    }) ;
    
    invokeHook('post', 'exportModules', client);
};

proto.createBundle = function(client){
    logger.debug("Bundle client files");
    
    if(client.source) return; // already generated source
    var jsonSchemas = toolbox.stringifySchema( client.schemas );
    var template = path.resolve(__dirname , "client/angoose-client.js");
    var content = fs.readFileSync(template , 'ascii');
    content = content.replace("/**SCHEMA_PLACEHOLDER*/",  jsonSchemas);
    content = content.replace("/**CONFIG_PLACEHOLDER*/", JSON.stringify( client.options ));  
    
    /**  include client specific extensions*/
    var clientModuleFile = path.resolve(__dirname , "client/angoose-angular.js");
    content += fs.readFileSync(clientModuleFile, 'ascii');

    clientModuleFile = path.resolve(__dirname , "client/angoose-jquery.js");
    content += fs.readFileSync(clientModuleFile, 'ascii');
    
    clientModuleFile = path.resolve(__dirname , "client/angoose-node.js");
    content += fs.readFileSync(clientModuleFile, 'ascii');
    
    client.source = content;
}

/**
 * This method configures an options object which will be served as Angoose client's initial configurations
 * Must set the `client.options` property after the method finishes
 */
proto.configClient = function(client){
    logger.debug("Setup client options");
    client.options = client.options || {};
    
    var angooseOpts = angoose().config();
    var clientOptionNames = ['url-prefix', 'logging'];
    
    _.extend(client.options, angooseOpts.client);
    client.options.urlPrefix = angooseOpts['url-prefix'];
    
    clientOptionNames.forEach(function(key){
        client.options[key] = angooseOpts[key];
    });
    //client.options.logging = angoose().config()['logging'] || 'INFO';
};
/**
 */
proto.generateClient = function(clientData){
    invokeHook('pre', 'generateClient', clientData);
    // client side configurations
    
    invokeHook('pre', 'configClient', clientData);
    this.configClient(clientData);
    invokeHook('post', 'configClient', clientData);
    
    invokeHook('pre', 'exportModules', clientData);
    this.exportModules(clientData);
    invokeHook('post', 'exportModules', clientData);
    
    invokeHook('pre', 'createBundle', clientData);
    this.createBundle(clientData);
    invokeHook('post', 'createBundle', clientData);
    
    invokeHook('post', 'generateClient', clientData);
    
};
//@tood: ,serializeModules,serializeModule,prepareSchema
// Bundle.hookables = 'generateClient,configClient,exportModules,exportModule,createBundle'.split(",");
// toolbox.addHookPoints(Bundle);

Bundle.typeOf = toolbox.typeOf;
module.exports = Bundle;