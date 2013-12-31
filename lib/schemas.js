var logger = require("log4js").getLogger("angoose");
var _ =require("underscore");

var FunctionNamePattern = /^function\s+(remote|server|portable)/i;

var parseDeclaredArguments = function(funcBody){
    if(typeof funcBody === 'function') funcBody = funcBody.toString();
    if(funcBody && typeof funcBody === "string"  && funcBody.substr(0,8) == "function") {
        var startArgs = funcBody.indexOf('(') + 1;
        var endArgs = funcBody.indexOf(')');
        return  funcBody.substring(startArgs, endArgs)
    }
    return null;
}

var constructProxyFunc=function(funcName, args, funcType){
    var proxyBody =  "function " + funcType +"(" + args+")";
    proxyBody+= "{return this.angoose$(this,'"+ funcName +"', arguments)}";
    return proxyBody; 
}

var decorateModel = function(model){
    var schema = model.schema;    
    if(getSchemaType(schema) != 'mongoose') return;
    
    var instanceMethods = "save,remove,populate";
    instanceMethods.split(",").forEach(function(m){
        m = m.replace(/\s+/g, '');
        if(!schema.methods[m]) 
            schema.methods[m]= function remote(){};     
    });
    var staticMethods = "populate,find,findOne,findById,findByIdAndRemove,findByIdAndUpdate,findOneAndRemove,findOneAndUpdate,update,remove";
    staticMethods.split(",").forEach(function(m){
        m = m.replace(/\s+/g, '');
        schema.statics[m] || (schema.statics[m]= function remote(){} );     
    });
    //@todo: remove the methods
    console.log("##### methods", schema.methods)
}
var getSchemaType = function(){
    //@todo
    return 'mongoose';
}

var getFunctionType = function(model, funcName, funcBody){
        //console.log("*******************", funcName, " *************")
        // we only deal with delared methods
        if(! model.schema.methods[funcName] && ! model.schema.statics[funcName] ) return; 
        var ftype = '_';
        if(model.schema.methods[funcName]) ftype+='instance';
        if(model.schema.statics[funcName]) ftype+='static';
        ftype+="_";
        //  instance, static
        //  angoose: remote, server, portable, default is remote
        var matcher = FunctionNamePattern.exec(funcBody);
        ftype+= matcher? matcher[1]: 'remote'; //default is remote
        return ftype;
}    

var stringify = function(modelName, model){
    var funcs = {};
    var funcStringifier = function (key, value) {
        if (typeof value !== 'function') return value;
        var body =  value.toString();
        var funcType = getFunctionType(model, key, body);
        if(!funcType) return; //'not-available';
        logger.debug("Stringify function",key, funcType);
        if(funcType.indexOf("server")>0) return 'available-serverside-only';
        
        var args = parseDeclaredArguments(body);
        
        if(funcType.indexOf("portable")>0){
            // the function can be executed client side
            body = body.replace(/function\s+portable/i, "function "+ funcType);
        }
        else{
            // stub the function
            body = constructProxyFunc(key,args, funcType)
        }
        var lookupKey = _.uniqueId("FUNCTION-NUMBER-");
        funcs[lookupKey] = body; 
        return lookupKey;
    }
    // add Monggose model methods
    console.log("stringify ")
    var original = {methods: model.schema.methods, statics: model.schema.statics };
    model.schema.methods = _.clone( model.schema.methods );
    model.schema.statics = _.clone( model.schema.statics);
    try{
        decorateModel(model);
        var ret = JSON.stringify( model.schema,  funcStringifier, "\t"  );
        for(var lookupKey in funcs){
            // we do this so that the function body acturally appears as a function, instead of a string
            ret = ret.replace( '"'+  lookupKey + '"', funcs[lookupKey]);
        }
    }   
    finally{
        model.schema.methods = original.methods;
        model.schema.statics = original.statics;
    } 
    return ret;
}    

module.exports = {
    getFunctionType:getFunctionType,
    stringify: stringify,
    parseDeclaredArguments:parseDeclaredArguments
}  