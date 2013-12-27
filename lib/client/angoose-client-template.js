/** Angoose Client Core */
// depdnencies: http, Q
var AngooseClient = function(){};
(function(){
    var nextCounter = function(){
        AngooseClient.base = AngooseClient.base || Math.round( Math.random() * 10000 ) * 10000; 
        return AngooseClient.base++;
    }
    
    AngooseClient.invoker = function(model , methodName, methodArgs){
        console.log("invokinh",methodName,  typeof(methodArgs), methodArgs.length)
        // converting arguments to array
         var modelName=null;
         var modelClass = null;
         var depends = null;
          var data = {
                 method: methodName,
                 seqnumber: nextCounter(),
                 args: []
          }
          for(var i=0; methodArgs && methodArgs.length>i;i++){
              data.args.push(methodArgs[i]);
          }
          
         if(typeof model == 'function'){
             modelName = model.prototype.classname$;
             data.target =  modelName; 
             depends = model.prototype.dependencies$;
             modelClass = model;
         }
         else
         {
             modelName =   model.classname$;
             data.target = model;
             depends = model.dependencies$;
             modelClass = AngooseClient.model(modelName);
         }
         console.log("====== Client RMI Call #", data.seqnumber, methodName, "on", data.target);
         var http = depends['http'];
         var theQ = depends['promise'];
         if(!http || !theQ) throw "Missing http and/or Q dependencies";
         var deferred = theQ.defer();
         var ret = http.post("/angoose/rmi/" + modelName+"/"+methodName, data);
         ret.done(function(retdata){
             console.log("====== Client RMI Call #", data.seqnumber, " result:", retdata );
             //@todo construct object, ret value types:  1) model data, 2) list of model data, 3) String, 4) dict
             if(retdata && typeof retdata.data == 'object' && typeof( retdata.data.__v )!='undefined') {
                 ////@todo better way to determinet type
                 return deferred.resolve( new modelClass(retdata.data) );
             }
             if(retdata && retdata.target && typeof model == 'object'){
                 // state has been changed on the server side
                 model.mergeData(retdata.target);
                 console.log("Merged server side data");
             }
             return deferred.resolve(retdata.data);
         }, function(err){
             console.log("====== Client RMI Call #", data.seqnumber, " error:", err);
             return deferred.reject(err);
         })
         return deferred.promise;
    }
    
    /** compile the model based on the server side schema */
    var compile = function(modelName, schema, dependencies){
        console.log("Compiling model", modelName)
        var model = function(data){
            // model constructor
            for(var i in data){
                this[i] = data[i];
            }
        };
        // instance methods
        model.prototype = schema.methods || {};
        model.prototype.angoose$ = AngooseClient.invoker;
        model.prototype.schema$ = schema;
        model.prototype.dependencies$ = dependencies;
        model.prototype.classname$ = modelName;

        // merge data into this instance
        model.prototype.mergeData = function(source){
            if(typeof source != "object") throw "Invalid source object, must be an model instance";
            //@todo: proper implementation
            for(var i in source){
                this[i] = source[i];
            }
        }        
        // static method
        model.findOne = function(q){
            return AngooseClient.invoker(model, 'findOne', arguments)
        }
        AngooseClient.models =AngooseClient.models || {};
        AngooseClient.models[modelName] = model; 
        return model;
    };
    
    AngooseClient.modelNames = function(){
        var ret = [];
        for(var key in AngooseClient.schemas){
            ret.push(key);
        }
        return ret;
    };
    
    AngooseClient.init = function(dependencies){
        if(AngooseClient.initialized) {
            console && console.log("init has been called");
            return;
        }
        AngooseClient.dependencies = dependencies;
        console && console.log("Initializing client angoose models")
        for(var mName in  AngooseClient.schemas){
            compile(mName, AngooseClient.schemas[mName], dependencies);
        }
        AngooseClient.initialized=true;
    };
    AngooseClient.model = function(name){
        if(!AngooseClient.initialized) throw "Angoose models not initialized yet";
        return AngooseClient.models[name];
    };
    AngooseClient.schemas = {/**SCHEMA_PLACEHOLDER*/};
    return AngooseClient;
})();