var logger = require("log4js").getLogger("angoose");
var _ =require("underscore");
var parseDeclaredArguments = function(value){
    if(value && typeof value === "string"  && value.substr(0,8) == "function") {
        var startArgs = value.indexOf('(') + 1;
        var endArgs = value.indexOf(')');
        return  value.substring(startArgs, endArgs)
    }
    return null;
}

var constructProxyFunc=function(funcName, args, funcType){
    var proxyBody =  "function " + funcType +"(" + args+")";
    proxyBody+= "{return this.angoose$(this,'"+ funcName +"', arguments)}";
    return proxyBody; 
}

var FunctionNamePattern = /^function\s+(remote|server|portable)/i;

var service = {};
service.getFunctionType = function(model, funcName, funcBody){
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

service.stringify = function(modelName, model){
    
    var funcs = {};
    
    var funcStringifier = function (key, value) {
        if (typeof value !== 'function') return value;
        var body =  value.toString();
        var funcType = service.getFunctionType(model, key, body);
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
    //var jsonSpacer = typeof(configs.jsonSpacer) == 'undefined'?'\t': configs.jsonSpacer;
    var jsonSpacer = '\t';
    var ret = JSON.stringify( model.schema,  funcStringifier, jsonSpacer  );  
    for(var lookupKey in funcs){
        // we do this so that the function body acturally appears as a function, instead of a string
        ret = ret.replace( '"'+  lookupKey + '"', funcs[lookupKey]);
    }
    return ret;
}    

module.exports = service;