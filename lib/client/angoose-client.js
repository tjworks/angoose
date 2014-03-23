/** Angoose Client Core */
/**  depdnencies: http, Q */
(function BootstrapAngoose() {

    AngooseClient = function(name) {
        if ( typeof $anget != 'undefined') {
            return $anget(camelcase(name));
        }
        return AngooseClient.getClass(name)
    };

    var logger = getLogger();
    logger.setLevel(config('logging') || 'INFO');

    AngooseClient.getClass = getClass;
    AngooseClient.model = getClass;
    AngooseClient.modelNames = modelNames;
    AngooseClient.init = init;
    AngooseClient.module = getClass;
    AngooseClient.config = config;
    AngooseClient.logger = logger;

    if ( typeof (angoose) == 'undefined') {
        angoose = AngooseClient;
    }

    logger.info("Bootstraping angoose-client");

    function getLogger() {
        var levels = {
            TRACE : {
                v : 1,
                name : "TRACE"
            },
            DEBUG : {
                v : 2,
                name : "DEBUG"
            },
            INFO : {
                v : 3,
                name : "INFO"
            },
            WARN : {
                v : 4,
                name : "WARN"
            },
            ERROR : {
                v : 5,
                name : "ERROR"
            },
            LOG : {
                v : 6,
                name : "LOG"
            }
        };

        var ClientLogger = {
            levels : levels,
            level : levels.INFO
        }
        var methods = "log,info,trace,debug,warn,error".split(",");
        for(var i=0; i < methods.length; i++){ 
            var method = methods[i];
            if(typeof(console)!='undefined' && console[method])
                ClientLogger[method]= getLoggingFunc(method);
            else
                ClientLogger[method]=function(){}
        };
        function getLoggingFunc(method){
            return function(){
                if(ClientLogger.level.v <=  levels[method.toUpperCase()].v ){
                    var args = []; args.push( method.toUpperCase() + ":");
                    for(var i =0;i<arguments.length;i++) args.push(arguments[i]);
                    if(method == 'trace') 
                        console.debug.apply(console,args);
                    else
                        console[method].apply(console,args)
                }
            }
        }
        ClientLogger.setLevel=function(level){
            if(!level) return; 
            level = level.toUpperCase();
            ClientLogger.level = levels[level] || levels.INFO;
        }
        return ClientLogger;
    }

    var counterBase = Math.round(Math.random() * 10000) * 10000;
    var nextCounter = function() {
        return counterBase++;
    }
    var encode$ = function(obj) {
        if (!obj || typeof obj != 'object')
            return obj;
        if (obj && obj.length) {
            for (var i = 0; i < obj.length; i++) {
                obj[i] = encode$(obj[i]);
            };
        } else {
            //logger.debug("Type", (typeof obj), obj)
            for (var key in obj) {
                var val = encode$(obj[key]);
                if (key.indexOf('$') == 0) {
                    delete obj[key];
                    key = "_mongo_" + key;
                }
                obj[key] = val;
            }
        }
        return obj;
    }
    var autoThrower = null;
    var handleReturn = function(retval, callback, deferred, error) {
        if (error) {
            if ( typeof (error) !== 'object')
                error = {
                    message : error
                }
            error.toString = function() {
                this.consumed = true;
                return this.message || Object.toString.call(this);
            }
        }
        if (callback)
            return callback(error, retval);
        return error ? deferred.reject(error) : deferred.resolve(retval);
    }
    function staticInvoker(modelClass, methodName, methodArgs) {
        return invoker(modelClass, methodName, methodArgs, null);

    };
    function instanceInvoker(modelClass, model, methodName, methodArgs) {
        //var modelClass = getClass(model.classname$)
        return invoker(modelClass, methodName, methodArgs, model);
    }

    function invoker(modelClass, methodName, methodArgs, modelInstance) {
        // modelInstance can be null, everything else is required.
        var modelName = modelClass.modelName;
        logger.trace("invoker: ", modelName, methodName, methodArgs);
        var callback = null;
        var isStatic = modelInstance == null;
        var depends = modelClass.dependencies$;
        var data = {
            method : methodName,
            seqnumber : nextCounter(),
            args : [],
            clazz : modelName,
            static : isStatic
        }
        for (var i = 0; methodArgs && methodArgs.length > i; i++) {
            if ( typeof methodArgs[i] != 'function')
                data.args.push(methodArgs[i]);
            else {
                callback = methodArgs[i]
                data.args.push("$callback")
                logger.debug("Callback provided");
            }
        }
        if (!isStatic) {
            data.instance = modelInstance;
            // including model instance data for instance methods
        }

        // angular http ignores all key names starting with $, this will break the mongo query
        data = encode$(data);
        var callname = modelName + "." + methodName;
        logger.debug("****** BEGIN RMI #", data.seqnumber, callname, data);
        var http = depends['http'];
        var theQ = depends['promise'];
        if (!http || !theQ)
            throw "Missing http and/or Q dependencies";
        var deferred = theQ.defer();
        var ret = http.post((getConfigs().urlPrefix || '/angoose') + "/rmi/" + modelName + "/" + methodName, data);
        ret.done(function(retdata) {
            logger.debug("====== END RMI #", data.seqnumber, callname, " Result:", retdata);
            var val = undefined;
            //@todo construct object, ret value types:  1) model data, 2) list of model data, 3) String, 4) object
            if (retdata && retdata.retval && (retdata.datatype == 'model' || retdata.datatype == 'models')) {

                if (retdata.datatype == 'model') {
                    val = newInstance(modelClass, retdata.retval);
                } else {
                    var models = [];
                    for (var i = 0; i < retdata.retval.length; i++) {
                        models.push(newInstance(modelClass, retdata.retval[i]));
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
                logger.trace("Merged server side data", modelInstance);
            }
            if (retdata.success)
                return handleReturn(val || retdata.retval, callback, deferred);
            var ex = retdata.exception ? retdata.exception : retdata;
            return handleReturn(null, callback, deferred, ex);
            //deferred.reject(ex)
        }, function(errdata) {
            logger.debug("====== END RMI #", data.seqnumber, callname, " Error:", errdata);
            if (!errdata)
                return handleReturn(errdata, callback, deferred, "Unexpected server error occurred.");
            var ex = errdata && errdata.exception ? errdata.exception : {
                message : errdata
            };
            //var ex = errdata.exception?  (errdata.exception.message || errdata.exception.value) : errdata;
            return handleReturn(null, callback, deferred, ex);
            //return deferred.reject(ex);
        })
        if (!callback)
            return deferred.promise;
    }

    function newInstance(clazz, jsonData) {
        if (jsonData && jsonData.__t && jsonData.__t !== clazz.name) {
            clazz = getClass(jsonData.__t) || clazz;
            //@todo: __t handling is not long term solution
        }
        return new clazz(jsonData);
    }

    function createProxy(module, funcName, func, funcType) {
        if ( typeof (func) == 'function')
            return func;
        if ( typeof (func) == "string" && func.indexOf("function") == 0) {
            var vname;
            return eval("vname=" + func);
        }
        if (funcType == 'static') {
            return function proxy() {
                return staticInvoker(module, funcName, arguments);
            }
        };
        if (funcType == 'instance') {
            return function proxy() {
                return instanceInvoker(module, this, funcName, arguments);
            }
        };

    }

    /** compile the model based on the server side schema */
    function compile(modelName, schema, dependencies) {
        logger.trace("Compiling schema ", modelName)
        var model = function AngooseModule(data) {
            //@todo proper clone
            for (var i in data) {
                this[i] = data[i];
            }
        };

        model.toString = function() {
            return "PROXY: function " + modelName + "()";
        }
        // static methods
        for (var name in schema.statics) {
            model[name] = createProxy(model, name, schema.statics[name], 'static');
        }
        for (var name in schema.methods) {
            model.prototype[name] = createProxy(model, name, schema.methods[name], 'instance');
        }

        //model.angoose$ = staticInvoker;
        model.dependencies$ = dependencies;
        model.schema = schema;
        //model.prototype.angoose$ = instanceInvoker;
        //model.prototype.classname$ = modelName;
        //model.prototype.schema$ = schema;
        model.prototype.get = getter;
        model.prototype.set = setter;
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

    function config(path, val) {
        var options = getConfigs();
        if(!path) return options; /**@todo: probably a deep copy */
        
        if(typeof (path) === 'string'){
             if(val === undefined)
                return  getter.call(options, path);
             setter.call(options, path, val);
        }
    }

    function init(dependencies) {
        if (AngooseClient.initialized) {
            logger.debug("init has been called");
            return;
        }
        AngooseClient.dependencies = dependencies;
        logger.debug("Creating client side proxies for backend modules");
        for (var mName in getSchemas()) {
            compile(mName, getSchemas()[mName], dependencies);
        }
        AngooseClient.initialized = true;
    };
    function getClass(name) {
        if (!AngooseClient.initialized)
            throw "Angoose models not initialized yet";
        name = camelcase(name);
        return AngooseClient.models[name];
    };
    
     function getter(path) {
         if(!path) return undefined;
          var   pieces = path.split('.');
          var obj = this;
          for (var i = 0, l = pieces.length; i < l; i++) {
            obj = undefined === obj || null === obj
              ? undefined
              : obj[pieces[i]];
          }
          return obj;
    };
    function  setter(path, val){
    if(!path  || typeof(path)!='string') return;
     var   pieces = path.split('.');
      var obj = this;
      for (var i = 0, len = pieces.length; i < len; i++) {
          if(i+1  == len ) // last one
          {
              obj[ pieces[i]] = val;
              return;
          }
          obj[pieces[i]] = obj[pieces[i]] || {};
          obj = obj[pieces[i]] || {};
      }
    }

    function camelcase(name, space) {
        // converting client-user to ClientUser
        if (!name)
            return name;
        var parts = name.split("-");
        name = "";
        for (var i = 0; i < parts.length; i++) {
            if (parts[i] && parts[i].length > 0) {
                name = name && space ? name + " " : name;
                name += parts[i].substring(0, 1).toUpperCase() + parts[i].substring(1);
            }
        }
        return name;
    }

    function getConfigs() {
        return /**CONFIG_PLACEHOLDER*/
    };
    function getSchemas() {
        return /**SCHEMA_PLACEHOLDER*/
    };
})();

