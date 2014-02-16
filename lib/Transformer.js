var logger = require("log4js").getLogger("angoose");
var hooks = require("hooks");
var _ =require("underscore");
var toolbox = require("./util/toolbox");
var traverse  = require("traverse");

function decorateMongooseSchema(model, schema){
    if(!model.schema || !model.schema.paths) return;
    
    var instanceMethods = "save,remove,populate";
    instanceMethods.split(",").forEach(function(m){
        m = m.replace(/\s+/g, '');
        if(!schema.methods[m]) 
            schema.methods[m]= function remote(){};     
    });
    var staticMethods = "populate,find,findOne,findById,findByIdAndRemove,findByIdAndUpdate,findOneAndRemove,findOneAndUpdate,update,remove,count,geoNear,geoSearch,create";
    staticMethods.split(",").forEach(function(m){
        m = m.replace(/\s+/g, '');
        schema.statics[m] || (schema.statics[m]= function remote(){} );     
    });
    schema.paths = traverse(model.schema.paths).map(function(item){
        if(!item) return;
        if(item.options && typeof(item.options.type) === 'function' ){
            var fn = item.options.type;
            item.options.type = fn.name || fn.toString();                
        }
        else if(typeof(item) == 'function')
            this.update( 'not-supported' );
        if(item.requiredValidator) delete item.requiredValidator;
        if(item.enumValidator) delete item.enumValidator;
        if(item.validators) delete item.validators; /**@todo validators are not supported yet*/
    }); 
    schema.options = traverse( model.schema.options).clone();
    
    /**@todo: remove the methods */
}
 

function AngooseSchema(){}

//AngooseSchema.prototype =   {
    //stringify: stringify,
    //parseDeclaredArguments:toolbox.parseDeclaredArguments,
    //getReference:getReference,
    //getFunctionName: getFunctionName
//};
var proto = AngooseSchema.prototype;  
/**
 * prepare the schema for the module
 * 
 * @param {String} moduleName
 * @param {Object} module
 */
proto.prepareSchema = function(moduleName, module, callback){
    logger.trace("moduleSchema", moduleName);
    /**@todo: move to extension */
    var schemaObj =  module.schema || module.getSchema();
    var ret = {};
    ret.moduleName = moduleName;
    ret.methods = _.clone( schemaObj.methods ) || {};
    ret.statics = _.clone( schemaObj.statics) || {};
    decorateMongooseSchema(module, ret);
    callback(null, ret);
};

proto.serializeModule = function(moduleName, module, callback){
    logger.trace('serialize schema', moduleName);
    var me = this; 
    this.prepareSchema(moduleName, module, function(err, schemaObj){
        var str = toolbox.stringifySchema( schemaObj);
        callback(null, str);
    });
};

proto.serializeModules = function(modules, callback){
    /** generate client side schemas*/
    logger.debug("Generating client schemas")
    var ret = {};
    var me = this;
   
    var names = Object.keys(modules);
    var total = names && names.length;
    if(!total) return  callback(null, ret);
   
    function iterator(index){
        if(index>= total) return callback(null, ret);
        var moduleName =  names[index];
        var module = modules[moduleName];
        if(module.config && module.config("visibility") === 'local') 
            iterator(index+1);
        else me.prepareSchema(moduleName, module, function(err, schemaObj){
            if(!err){
              ret[moduleName] = schemaObj || {};
              iterator(index+1);
            } 
            else callback(err);
        });    
    };
    iterator(0);
};

proto.configClient = function(options, callback){
    var opts = {urlPrefix: options['url-prefix']};
    callback(null, opts );
};
/**
 */
proto.generateClient = function(modules, options, callback){
    var content = ""
    var me = this;
    var fs = require("fs");
    this.configClient(options, function(err, clientOpts){
        me.serializeModules(modules, function(err, moduleSchemas ){
            // var schemas = '{';
            // Object.keys(jsonModules).forEach(function(moduleName){
                // var tmp = moduleName + ":" +  jsonModules[moduleName];
                // if(schemas != "{")
                    // schemas += ",";
                // schemas+= tmp;            
            // });
            // schemas+="}";
            var jsonSchemas = toolbox.stringifySchema(moduleSchemas);
            var template = require("path").resolve(__dirname , "client/angoose-client.js");
            var filename = options['client-file'];
            content = fs.readFileSync(template , 'ascii');
            content = content.replace("/**SCHEMA_PLACEHOLDER*/",  jsonSchemas);
            /** angoose options */
            content = content.replace("/**CONFIG_PLACEHOLDER*/", JSON.stringify(clientOpts));  
            
            /**  include client specific extensions*/
            var clientModuleFile = require("path").resolve(__dirname , "client/angoose-angular.js");
            content += fs.readFileSync(clientModuleFile, 'ascii');
            clientModuleFile = require("path").resolve(__dirname , "client/angoose-jquery.js");
            content += fs.readFileSync(clientModuleFile, 'ascii');
            clientModuleFile = require("path").resolve(__dirname , "client/angoose-node.js");
            content += fs.readFileSync(clientModuleFile, 'ascii');
            
            if(filename.indexOf("/")>=0){
                var outputDir = filename.replace(/^(.*)\/[^\/]+$/, "$1");
                if(outputDir && !fs.existsSync){
                    logger.debug("Creating dir", outputDir)
                    fs.mkdirSync(outputDir);    
                }
            }
            fs.writeFileSync(filename, content);
            logger.debug("Generated the client file:", filename);
            callback(null, filename, content);
        });
    })
    
};

AngooseSchema.hookables = 'generateClient,configClient,serializeModules,serializeModule,prepareSchema'.split(",");
toolbox.addHookPoints(AngooseSchema);

AngooseSchema.typeOf = toolbox.typeOf;
module.exports = AngooseSchema;