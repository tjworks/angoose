

var logger = require("log4js").getLogger("angoose");
var _ =require("underscore");

var FunctionNamePattern = /^function\s+(remote|local|portable)/i;

var parseDeclaredArguments = function(funcBody){
    if(typeof funcBody === 'function') funcBody = funcBody.toString();
    if(funcBody && typeof funcBody === "string"  && funcBody.substr(0,8) == "function") {
        var startArgs = funcBody.indexOf('(') + 1;
        var endArgs = funcBody.indexOf(')');
        return  funcBody.substring(startArgs, endArgs)
    }
    return "";
}

var constructProxyFunc=function(funcName, args, funcType){
    var proxyBody =  "function " + funcType +"(" + args+")";
    proxyBody+= "{return this.angoose$(this,'"+ funcName +"', arguments)}";
    return proxyBody; 
}

function decorateMongooseSchema(model, schema){
    if(getSchemaType(schema) != 'mongoose') return;
    
    var instanceMethods = "save,remove,populate";
    instanceMethods.split(",").forEach(function(m){
        m = m.replace(/\s+/g, '');
        if(!schema.methods[m]) 
            schema.methods[m]= function remote(){};     
    });
    var staticMethods = "populate,find,findOne,findById,findByIdAndRemove,findByIdAndUpdate,findOneAndRemove,findOneAndUpdate,update,remove,count,geoNear,geoSearch";
    staticMethods.split(",").forEach(function(m){
        m = m.replace(/\s+/g, '');
        schema.statics[m] || (schema.statics[m]= function remote(){} );     
    });
    /**@todo: remove the methods */
}
var getSchemaType = function(schema){
    if(schema.paths)
        return 'mongoose';
    return 'service'
}


var getFunctionType = function(schemaObj, funcName, funcBody){
        /** we only deal with delared methods */
        if(!  schemaObj.methods[funcName] && !  schemaObj.statics[funcName] ) return;
        var ftype = '_';
        if(schemaObj.methods[funcName]) ftype+='instance';
        if(schemaObj.statics[funcName]) ftype+='static';
        ftype+="_" + getFunctionAnnotation(funcBody);
        return ftype;
}    

var stringify = function(modelName, model){
    var funcs = {};
    var schemaObj =  model.schema || model.getSchema();
    var funcStringifier = function (key, value) {
        if (typeof value !== 'function') return value;
        var body =  value.toString();
        
        var funcType = getFunctionType(schemaObj, key, body);
        if(!funcType) return; //'not-available';
        logger.trace("Stringify function",key, funcType);
        if(funcType.indexOf("server")>0) return 'available-serverside-only';
        
        var args = parseDeclaredArguments(body);
        
        if(funcType.indexOf("portable")>0){
            /** the function can be executed client side */
            body = body.replace(/function\s+portable/i, "function "+ funcType);
        }
        else{
            /** stub the function */
            body = constructProxyFunc(key,args, funcType)
        }
        var lookupKey = _.uniqueId("FUNCTION-NUMBER-");
        funcs[lookupKey] = body; 
        return lookupKey;
    }
    /** add Monggose model methods */
    var original = {methods: schemaObj.methods, statics: schemaObj.statics };
    schemaObj.methods = _.clone( schemaObj.methods );
    schemaObj.statics = _.clone( schemaObj.statics);
    try{
        decorateMongooseSchema(model, schemaObj);
        var ret = JSON.stringify( schemaObj,  funcStringifier, "\t"  );
        for(var lookupKey in funcs){
            /**  we do this so that the function body acturally appears as a function, instead of a string */
            ret = ret.replace( '"'+  lookupKey + '"', funcs[lookupKey]);
        }
    }   
    finally{
        schemaObj.methods = original.methods;
        schemaObj.statics = original.statics;
    } 
    return ret;
}    

function  getFunctionAnnotation(funcBody){
    var matcher = FunctionNamePattern.exec(funcBody);
    return matcher? matcher[1]: 'remote'; //default is remote
}

function getReference(pathSchema){
    var opts = pathSchema.options;
    
    /** Mongoose, array of ObjectIDs */
    if( Array.isArray(opts.type) && opts.type.length>0  &&  opts.type[0] && opts.type[0].ref ) 
        return opts.type[0].ref;
    /** Single ObjectID Reference*/
    if(pathSchema.instance == 'ObjectID' && opts.ref) return opts.ref;
    
    
    if(pathSchema.options.ref && pathSchema.instance == 'CustomRef'){
        /** deform custom ref*/
       return pathSchema.options.ref;    
    }
    /** deform rich reference, array */
    if(Array.isArray(opts.type ) && pathSchema.caster && 
            pathSchema.caster.instance == 'CustomRef' && pathSchema.caster.options.ref ){ 
        return pathSchema.caster.options.ref;
    }
        
    return null;
}

var fnPattern = /^function\s+([^\(]*)/i;
function getFunctionName(fn){
    var funcBody = fn.toString();
    if(!funcBody) return null;
    var matcher = fnPattern.exec(funcBody);
    return matcher? matcher[1]: ''; //default is remote
}
module.exports = {
    getFunctionAnnotation:getFunctionAnnotation,
    stringify: stringify,
    parseDeclaredArguments:parseDeclaredArguments,
    getReference:getReference,
    getFunctionName: getFunctionName
}  