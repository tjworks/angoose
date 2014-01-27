/** Angoose Client Core */
/**  depdnencies: http, Q */
var AngooseClient = function() {};
(function() {
    
    // ** getClass **
    //
    // Get the model class, you may call static method such as findXXX or create new model instance
    //      
    //      var SampleUser = angoose.getClass('SampleUser');
    //      SampleUser.findOne();
    //      var u = new SampleUser(); 
    //
    AngooseClient.getClass = getClass;
    AngooseClient.model = getClass;
    AngooseClient.modelNames = modelNames;
    AngooseClient.init = init;
    
    var counterBase = Math.round(Math.random() * 10000) * 10000;
    var nextCounter = function() {
        return counterBase++;
    }
    var encode$ = function(obj){
        if(!obj || typeof obj != 'object') return obj;
        if(Array.isArray(obj)){
            for(var i=0;i<obj.length;i++){
                obj[i] = encode$(obj[i]);
            };
        }
        else{
            //console.log("Type", (typeof obj), obj)            
            Object.keys(obj).forEach(function(key){
                var val = encode$(obj[key]);
                if(key.indexOf('$')==0){
                    delete obj[key];
                    key = "_mongo_"+key;
                }
                obj[key] = val;
            })
        }
        return obj;
    }
    var getter = function (path) {
      var   pieces = path.split('.');
      var obj = this;
      for (var i = 0, l = pieces.length; i < l; i++) {
        obj = undefined === obj || null === obj
          ? undefined
          : obj[pieces[i]];
      }
      return obj;
    };


    var handleReturn = function(retval, callback, deferred, error){
        if(callback) return callback(error, retval);
        return  error? deferred.reject(error) : deferred.resolve(retval);
    }

    function staticInvoker(modelClass, methodName, methodArgs) {
        return invoker( modelClass,  methodName, methodArgs, null);

    };
    function instanceInvoker(model, methodName, methodArgs) {
        var modelClass = getClass(model.classname$)
        return invoker( modelClass, methodName, methodArgs, model);
    }
    function invoker(modelClass, methodName, methodArgs, modelInstance) {
        // modelInstance can be null, everything else is required.
        var modelName =  modelClass.prototype.classname$;
        console.log("invoker: ", modelName, methodName, methodArgs, modelClass);
        var callback = null;
        var isStatic = modelInstance==null;
        var depends = modelClass.dependencies$;
        var data = {
            method : methodName,
            seqnumber : nextCounter(),
            args : [],
            clazz: modelName,
            static: isStatic
        }
        for (var i = 0; methodArgs && methodArgs.length > i; i++) {
            if(typeof methodArgs[i] != 'function')
                data.args.push(methodArgs[i]);
            else{
                callback = methodArgs[i]
                data.args.push("$callback")
                console.log("Callback provided");
            }
        }
        if(!isStatic) {
            data.instance = modelInstance;  // including model instance data for instance methods
        } 

        // angular http ignores all key names starting with $, this will break the mongo query
        data = encode$(data);
        console.log("****** BEGIN Client Call #", data.seqnumber,modelName, methodName, data);
        var http = depends['http'];
        var theQ = depends['promise'];
        if (!http || !theQ) throw "Missing http and/or Q dependencies";
        var deferred = theQ.defer();
        var ret = http.post((getConfigs().urlPrefix || '/angoose') + "/rmi/" + modelName + "/" + methodName, data);
        ret.done(function(retdata) {
            console.log("****** END Client Call #", data.seqnumber, " result:", retdata);
            var val = undefined;
            //@todo construct object, ret value types:  1) model data, 2) list of model data, 3) String, 4) object
            if (retdata && retdata.retval  && ( retdata.datatype =='model' || retdata.datatype =='models')) {
                
                if(retdata.datatype == 'model'){
                    val = new modelClass(retdata.retval);
                }
                else{
                    var models = [];
                    for(var i =0; i< retdata.retval.length; i++){
                        models.push( new modelClass( retdata.retval[i]));
                    }
                    val = models;    
                }    
                //return handleReturn(val, callback, deferred);
                //                
                //return deferred.resolve(models);
            }
            if (retdata && retdata.instance && !isStatic) {
                // state has been changed on the server side
                modelInstance.mergeData(retdata.instance);
                console.log("Merged server side data");
            }
            if(retdata.success)
                return handleReturn(val || retdata.retval, callback, deferred);
            var ex = retdata.exception? (retdata.exception.message || retdata.exception.value)  : retdata;
            return handleReturn(null, callback, deferred, ex);
            //deferred.reject(ex)
        }, function(errdata) {
            console.log("****** END Client Call #", data.seqnumber, " error:", errdata);
            if(!errdata) return handleReturn(null, callback, deferred, "Unexpected server error occurred, please contact admin");
            var ex = errdata.exception?  (errdata.exception.message || errdata.exception.value) : errdata;
            return handleReturn(null, callback, deferred, ex);
            //return deferred.reject(ex);
        })
        if(!callback) return deferred.promise;
    }
    /** compile the model based on the server side schema */
    function compile(modelName, schema, dependencies) {
        console.log("Compiling schema into classes", modelName)
        var model = function(data) {
            //@todo proper clone
            for (var i in data) {
                this[i] = data[i];
            }
        };
        
        // static methods
        model.__proto__ = schema.statics || {};
        
        // instance methods
        model.prototype = schema.methods || {};
        
        model.angoose$ = staticInvoker;
        model.dependencies$ = dependencies;
        model.schema = schema;
        model.prototype.angoose$ = instanceInvoker;
        model.prototype.classname$ = modelName;
        //model.prototype.schema$ = schema;
        model.prototype.get = getter;
        model.modelName = modelName; // this is to be compatible with backend mongoose 

        // merge data into this instance
        model.prototype.mergeData = function(source) {
            if ( typeof source != "object")
                throw "Invalid source object, must be an model instance";
            //@todo: proper implementation
            for (var i in source) {
                this[i] = source[i];
            }
        }
        AngooseClient.models = AngooseClient.models || {};
        AngooseClient.models[modelName] = model;
        return model;
    };

    function modelNames() {
        var ret = [];
        for (var key in getSchemas()) {
            ret.push(key);
        }
        return ret;
    };

    function init(dependencies) {
        if (AngooseClient.initialized) {
            console && console.log("init has been called");
            return;
        }
        AngooseClient.dependencies = dependencies;
        console && console.log("Initializing client angoose models")
        for (var mName in getSchemas()) {
            compile(mName, getSchemas()[mName], dependencies);
        }
        AngooseClient.initialized = true;
    };
    function getClass(name) {
        if (!AngooseClient.initialized)
            throw "Angoose models not initialized yet";
        return AngooseClient.models[name];
    };
    function getConfigs() {  return  {/**CONFIG_PLACEHOLDER*/} } 
    function getSchemas() {  return  {/**SCHEMA_PLACEHOLDER*/} } 
})(); 

if (typeof(angoose) != 'undefined'){
    function angoose(name){
        return AngooseClient.getClass(name);
    }
    angoose.module =  function(){
        return AngooseClient.getClass(name);
    }   
} 

