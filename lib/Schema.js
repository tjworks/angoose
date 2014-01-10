// ##### Function Name Annotations
// 
// Function name defined on the models and services is of particular interest to Angoose. 
// To facilitate the exporting of methods to the remote client, Angoose relies on the function name to hint it which methods should be 
// exported and which ones should not. In general the function name is not required when you define the methods on Mongoose schema
// or on a Service class because the function would be assigned to a property of the container object. Example for a Mongoose model shcema:
// 
//     {
//        methods: {
//            updateStatus: function(){
//                // body
//            }
//        }
//     }  
//  
// Angoose hence uses the unused function name as a way to annotate the function for the purpose of RMI. For instance, to indicate a method
// can be exported to the remote client, you would write the function like this:
// 
//     {
//        methods: {
//            updateStatus: function remote(){
//                // body
//            }
//        }
//     }
//     
// Following are a list of keywords that can be used to annotate the function. You may use more than one keywords, just join them using 
// underscore, i.e., static_remote 
// 
// ** remote **
// This indicates the method can be exported to remote client. By default all the methods will be considered this type
// 
// ** portable **
// This indicates the method can be "ported" to remote client and executed on the client side without even contacting server. An example of
// this usage is some helper method that only operates on the instance object and has no other dependencies. i.e., a method to concatenate the names
// to return a full name:
// 
//     {
//       methods: {
//           getFullname: function portable{
//               return (this.firstname || "") + " " 
//                          + (this.lastname || "");
//           }
//       }
//     } 
// 
// ** static **
// Indicates this is a static method and can be invoked on the class/function level. Note in Mongoose model, you should use the `statics` property to
// define the static methods. This is mostly useful for Service classes.$
// 
// ** instance **
// This is the default value so usually you don't need to use it. It's here only for documentation purpose. 
// 
// ** local **
// This indicates the method should NOT be exported. It can only be invoked on the server side, locally. 
//    

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
    var staticMethods = "populate,find,findOne,findById,findByIdAndRemove,findByIdAndUpdate,findOneAndRemove,findOneAndUpdate,update,remove";
    staticMethods.split(",").forEach(function(m){
        m = m.replace(/\s+/g, '');
        schema.statics[m] || (schema.statics[m]= function remote(){} );     
    });
    //@todo: remove the methods
    //console.log("##### methods", schema.methods)
}
var getSchemaType = function(schema){
    if(schema.paths)
        return 'mongoose';
    return 'service'
}

var getFunctionType = function(schema, funcName, funcBody){
        //console.log("*******************", funcName, " *************")
        // we only deal with delared methods
        if(!  schema.methods[funcName] && !  schema.statics[funcName] ) return; 
        var ftype = '_';
        if(schema.methods[funcName]) ftype+='instance';
        if(schema.statics[funcName]) ftype+='static';
        ftype+="_";
        //  instance, static
        //  angoose: remote, server, portable, default is remote
        var matcher = FunctionNamePattern.exec(funcBody);
        ftype+= matcher? matcher[1]: 'remote'; //default is remote
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
    var original = {methods: schemaObj.methods, statics: schemaObj.statics };
    schemaObj.methods = _.clone( schemaObj.methods );
    schemaObj.statics = _.clone( schemaObj.statics);
    try{
        decorateMongooseSchema(model, schemaObj);
        var ret = JSON.stringify( schemaObj,  funcStringifier, "\t"  );
        for(var lookupKey in funcs){
            // we do this so that the function body acturally appears as a function, instead of a string
            ret = ret.replace( '"'+  lookupKey + '"', funcs[lookupKey]);
        }
    }   
    finally{
        schemaObj.methods = original.methods;
        schemaObj.statics = original.statics;
    } 
    return ret;
}    

module.exports = {
    getFunctionType:getFunctionType,
    stringify: stringify,
    parseDeclaredArguments:parseDeclaredArguments
}  