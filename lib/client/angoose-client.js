/** Angoose Client Core */
/**  depdnencies: http, Q */
var AngooseClient = function() {};
function BootstrapAngoose(){
    var logger = ClientLogger;

       logger.info("Bootstraping angoose-client");
    
    // ** getClass **
    //
    // Get the model class, you may call static method such as findXXX or create new model instance
    //      
    //      var SampleUser = angoose.getClass('SampleUser');
    //      SampleUser.findOne();
    //      var u = new SampleUser(); 
    //
    
    var counterBase = Math.round(Math.random() * 10000) * 10000;
    var nextCounter = function() {
        return counterBase++;
    }
    var encode$ = function(obj){
        if(!obj || typeof obj != 'object') return obj;
        if(obj && obj.length){
            for(var i=0;i<obj.length;i++){
                obj[i] = encode$(obj[i]);
            };
        }
        else{
            //logger.log("Type", (typeof obj), obj)
            for(var key in obj){
                var val = encode$(obj[key]);
                if(key.indexOf('$')==0){
                    delete obj[key];
                    key = "_mongo_"+key;
                }
                obj[key] = val;
            }            
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
    function instanceInvoker(modelClass, model, methodName, methodArgs) {
        //var modelClass = getClass(model.classname$)
        return invoker( modelClass, methodName, methodArgs, model);
    }
    function invoker(modelClass, methodName, methodArgs, modelInstance) {
        // modelInstance can be null, everything else is required.
        var modelName =  modelClass.modelName;
         logger.trace("invoker: ", modelName, methodName, methodArgs, modelClass);
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
                logger.info("Callback provided");
            }
        }
        if(!isStatic) {
            data.instance = modelInstance;  // including model instance data for instance methods
        } 

        // angular http ignores all key names starting with $, this will break the mongo query
        data = encode$(data);
         logger.debug("****** BEGIN Client Call #", data.seqnumber,modelName, methodName, data);
        var http = depends['http'];
        var theQ = depends['promise'];
        if (!http || !theQ) throw "Missing http and/or Q dependencies";
        var deferred = theQ.defer();
        var ret = http.post((getConfigs().urlPrefix || '/angoose') + "/rmi/" + modelName + "/" + methodName, data);
        ret.done(function(retdata) {
             logger.debug("****** END Client Call #", data.seqnumber, " result:", retdata);
            var val = undefined;
            //@todo construct object, ret value types:  1) model data, 2) list of model data, 3) String, 4) object
            if (retdata && retdata.retval  && ( retdata.datatype =='model' || retdata.datatype =='models')) {
                
                if(retdata.datatype == 'model'){
                    val = newInstance(modelClass,   retdata.retval);
                }
                else{
                    var models = [];
                    for(var i =0; i< retdata.retval.length; i++){
                        models.push( newInstance(modelClass, retdata.retval[i]));
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
                 logger.info("Merged server side data");
            }
            if(retdata.success)
                return handleReturn(val || retdata.retval, callback, deferred);
            var ex = retdata.exception? (retdata.exception.message || retdata.exception.value)  : retdata;
            return handleReturn(null, callback, deferred, ex);
            //deferred.reject(ex)
        }, function(errdata) {
             logger.error("****** END Client Call #", data.seqnumber, " error:", errdata);
            if(!errdata) return handleReturn(null, callback, deferred, "Unexpected server error occurred, please contact admin");
            var ex = errdata.exception?  (errdata.exception.message || errdata.exception.value) : errdata;
            return handleReturn(null, callback, deferred, ex);
            //return deferred.reject(ex);
        })
        if(!callback) return deferred.promise;
    }
    function newInstance(clazz, jsonData){
        if(jsonData && jsonData.__t && jsonData.__t !== clazz.name ){
            clazz  = getClass(jsonData.__t) || clazz;  //@todo: __t handling is not long term solution 
        }
        return new clazz(jsonData);
    }
    function createProxy(module, funcName, func, funcType){
        if(typeof(func) == 'function') return func;
        if(typeof(func) == "string" && func.indexOf("function") == 0){
            var vname;
            return eval("vname="+func);
        }
        if(funcType == 'static'){
            return function proxy(){
                return staticInvoker(module, funcName, arguments);   
            }    
        };
        if(funcType == 'instance'){
            return function proxy(){
                return instanceInvoker(module, this, funcName, arguments);   
            }    
        };
        
    }
    /** compile the model based on the server side schema */
    function compile(modelName, schema, dependencies) {
         logger.debug("Client: compiling schema " , modelName)
        var model = function AngooseModule(data) {
            //@todo proper clone
            for (var i in data) {
                this[i] = data[i];
            }
        };
        
        // static methods
        for(var name in schema.statics){
            model[name] = createProxy(model, name,  schema.statics[name], 'static');
        }
        for(var name in schema.methods){
            model.prototype[name] = createProxy(model, name,  schema.methods[name], 'instance');
        }
        
        //model.angoose$ = staticInvoker;
        model.dependencies$ = dependencies;
        model.schema = schema;
        //model.prototype.angoose$ = instanceInvoker;
        //model.prototype.classname$ = modelName;
        //model.prototype.schema$ = schema;
        model.prototype.get = getter;
        model.modelName = modelName; // this is to be compatible with backend mongoose
        model.name = modelName; 

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
             logger.info("init has been called");
            return;
        }
        AngooseClient.dependencies = dependencies;
         logger.info("Initializing client angoose models")
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
    function getConfigs() {  return  /**CONFIG_PLACEHOLDER*/ };
    function getSchemas() {  return  /**SCHEMA_PLACEHOLDER*/ };
    
    AngooseClient.getClass = getClass;
    AngooseClient.model = getClass;
    AngooseClient.modelNames = modelNames;
    AngooseClient.init = init;
    AngooseClient.module = getClass;

}

BootstrapAngoose();     

if (typeof(angoose) == 'undefined'){
    function angoose(name){
        return AngooseClient.getClass(name);
    }
} 

