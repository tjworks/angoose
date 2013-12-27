/** Angoose Client Core */
// depdnencies: http, Q
var AngooseClient = function() {
};
(function() {
    var nextCounter = function() {
        AngooseClient.base = AngooseClient.base || Math.round(Math.random() * 10000) * 10000;
        return AngooseClient.base++;
    }

    AngooseClient.staticInvoker = function(modelClass, methodName, methodArgs) {
        return AngooseClient.invoker( modelClass,  methodName, methodArgs, null);

    };
    AngooseClient.instanceInvoker = function(model, methodName, methodArgs) {
        var modelClass = AngooseClient.model(model.classname$)
        return AngooseClient.invoker( modelClass, methodName, methodArgs, model);
    }
    AngooseClient.invoker = function(modelClass, methodName, methodArgs, modelInstance) {
        // modelInstance can be null, everything else is required.
        var modelName =  modelClass.prototype.classname$;
        console.log("invoker: ", modelName, methodName, methodArgs, modelClass);
        var isStatic = modelInstance==null;
        var depends = modelClass.dependencies$;
        var data = {
            method : methodName,
            seqnumber : nextCounter(),
            args : [],
            static: isStatic
        }
        for (var i = 0; methodArgs && methodArgs.length > i; i++) {
            data.args.push(methodArgs[i]);
        }
        if(!isStatic) {
            data.instance = modelInstance;  // including model instance data for instance methods
        } 

        console.log("====== Client RMI Call #", data.seqnumber, methodName, "on", data.target);
        var http = depends['http'];
        var theQ = depends['promise'];
        if (!http || !theQ) throw "Missing http and/or Q dependencies";
        var deferred = theQ.defer();
        var ret = http.post((AngooseClient.configs.urlPrefix || '/angoose') + "/rmi/" + modelName + "/" + methodName, data);
        ret.done(function(retdata) {
            console.log("====== Client RMI Call #", data.seqnumber, " result:", retdata);
            //@todo construct object, ret value types:  1) model data, 2) list of model data, 3) String, 4) object
            if (retdata && retdata.retval  && ( retdata.datatype =='model' || retdata.datatype =='models')) {
                if(retdata.datatype == 'model')
                    return deferred.resolve(new modelClass(retdata.retval));
                var models = [];
                for(var i =0; i< retdata.retval.length; i++){
                    models.push( new modelClass( object[i]));
                }
                return deferred.resolve(models);
            }
            if (retdata && retdata.instance && !isStatic) {
                // state has been changed on the server side
                modelInstance.mergeData(retdata.instance);
                console.log("Merged server side data");
            }
            return deferred.resolve(retdata.retval );
        }, function(errdata) {
            console.log("====== Client RMI Call #", data.seqnumber, " error:", errdata);
            var ex = errdata.exception? errdata.exception.value : errdata;
            return deferred.reject(ex);
        })
        return deferred.promise;
    }
    /** compile the model based on the server side schema */
    var compile = function(modelName, schema, dependencies) {
        console.log("Compiling model", modelName)
        var model = function(data) {
            //@todo proper clone
            for (var i in data) {
                this[i] = data[i];
            }
        };

        model.__proto__ = schema.statics || {};
        // static methods
        model.prototype = schema.methods || {};
        // instance methods
        model.angoose$ = AngooseClient.staticInvoker;
        model.dependencies$ = dependencies;
        model.schema$ = schema;
        model.prototype.angoose$ = AngooseClient.instanceInvoker;
        model.prototype.classname$ = modelName;

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

    AngooseClient.modelNames = function() {
        var ret = [];
        for (var key in AngooseClient.schemas) {
            ret.push(key);
        }
        return ret;
    };

    AngooseClient.init = function(dependencies) {
        if (AngooseClient.initialized) {
            console && console.log("init has been called");
            return;
        }
        AngooseClient.dependencies = dependencies;
        console && console.log("Initializing client angoose models")
        for (var mName in AngooseClient.schemas) {
            compile(mName, AngooseClient.schemas[mName], dependencies);
        }
        AngooseClient.initialized = true;
    };
    AngooseClient.model = function(name) {
        if (!AngooseClient.initialized)
            throw "Angoose models not initialized yet";
        return AngooseClient.models[name];
    };
    AngooseClient.configs = {/**CONFIG_PLACEHOLDER*/};
    AngooseClient.schemas = {/**SCHEMA_PLACEHOLDER*/};
    return AngooseClient;
})(); 