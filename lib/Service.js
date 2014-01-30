var logger = require("log4js").getLogger("angoose");
var _ =require("underscore");
var Remotable = require("./Remotable")

// ## angoose.Service
// Service is one of two main artifacts in Angoose. Service classes are used to define business operations that 
// are not necessarily tied to database models.
// 
// To create an angoose Service, you just need to extend from this class:
//
//      var angoose = require("angoose");
//      var service = {
//          geoEncode: function(stringAddress){
//                  /** call google API */
//                  return coordinates
//          }    
//      }
//      module.export = angoose.service('GeoService', service);
//
// The Service class file must be located under one of the `modelDir` or `serviceDir` directories.
//
var serviceProto = {
    toJSON: function(){
        return {};
    }
}
var Service = Remotable.extend(serviceProto,{baseClass:'Service'});

Service.getSchema = function(){
    var thisClass = this;
    var schema = {statics: {} };
    
    schema.methods = _.extend({}, thisClass.prototype)
    
    for(var name in thisClass.prototype){
        if( filter(name) ) continue;
        if(!thisClass.prototype.hasOwnProperty(name)) continue;
        var val = thisClass.prototype[name];
        if(typeof(val)!='function') continue;
        schema.methods[name] = val;   
    }
    
    for(var name in thisClass){
        if(!thisClass.hasOwnProperty(name)) continue;
        var val = thisClass[name];
        if( filter(name) ) continue;
        if(typeof (val) != 'function') continue;
        schema.statics[name] = val;
    }
    return schema;
}

function filter(methodName){
     if(Remotable.isRemotableReserved(methodName)) return true;
     if(['extend', 'getContext', 'getSchema','toJSON' ].indexOf(methodName)>=0) return true;
     return false;
}
module.exports = Service;