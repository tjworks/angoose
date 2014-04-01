/****** Angular Adapter for Angoose Client *******/
// Angular client for Angoose automatically register the model and service classes as angular injectables. 
// For instance, with the `SampleUser` model, you can inject in your controller:
//
//      angular.module('myapp', ['angoose.client'])
//            .controller('MyCtroller', function($scope, SampleUser){
//              $scope.users = SampleUser.$query({'status':'active'});
//        })      
//
(function(){
    var logger = AngooseClient.logger;
    
    if(typeof angular =='undefined'){
        logger.error("No angular")
        return;  
    } 
    logger.info("angoose-angular client adapter initializing");
    var angularModule =  angular.module("angoose.client", []);
    AngooseClient.client='angular';
    
    // ** angoose **
    //
    //  You may require `angoose` client as an injectable
    //  
    angularModule.factory('angoose', function($http, $q, $rootScope, $timeout){
            var myQ = addDoneMethod($q);
            AngooseClient.init({
                http:angularHttpWrapper($http, myQ, $rootScope, $timeout),
                promise: myQ
            });
            return AngooseClient;
    })
    function factoryFunc(modelName){
        logger.trace("Create factory for model "+ modelName)
        angularModule.factory(modelName , function($http, $q, $rootScope, $injector, angoose){
            var acModel = AngooseClient.model(modelName);
            resourceAdapt(acModel, $rootScope, $injector );
            return acModel;
        });
    }
    angular.forEach( AngooseClient.modelNames(), factoryFunc );

    function addDoneMethod($q){
        var myQ = angular.extend({}, $q)
        myQ.defer = function(){
            var out = $q.defer.apply($q, arguments);
            if(out.promise.done) return out;
            out.promise.done = function(successCallback, errorCallback){
                out.promise.then(successCallback, errorCallback);
            }
            return out;
        }
        return myQ;
    }
    function angularHttpWrapper($http, $q, $rootScope, $timeout){
        var autoThrower = null;
        
        var ret = {};
        ret.post = function(){
            var deferred = $q.defer();
            $http.post(arguments[0], arguments[1], {withCredentials:true}).success(function(data){
                deferred.resolve(  data );
                if(!data || !data.exception) return;
                if(!autoThrower){
                        data.exception.toString =    function(){
                            this.consumed = true;
                            return  this.message || Object.toString.call(this);
                        }
                        $rootScope.$emit('AngooseError', data.exception);
                        autoThrower = $timeout(function(){
                            autoThrower = null;
                            if(!data.exception.consumed){
                                console.error("Unhandled error detected, throwing", data.exception);
                                throw data.exception;  
                            } 
                        }, 100);  
                }   
            }).error(function(err){
                // emit angoose error
                deferred.reject(err);
            });
            return deferred.promise;
        }
        return ret;
    }
    function resourceAdapt(modelClass, $rootScope, $injector){
        // now adpat to angular resource
        modelClass.$get= function(){
            if(!modelClass.findOne) throw "Model does not support findOne operation";
            var modelInstance = new modelClass();
            modelClass.findOne.apply(modelClass, arguments).done(function(object){
                // the return data should be a model instance
                modelInstance.mergeData(object);
                //$rootScope.$digest();
                logger.trace("Copied server data to placeholder", modelInstance)
            }, errorHandler);    
            
            return modelInstance;
        };
        modelClass.$query=function(){
            if(!modelClass.find) throw "Model does not support find operation";
            var models = [];
            modelClass.find.apply(modelClass, arguments).done(function(retModels){
                // the return data should be a list of models
                models.length = 0;
                for(var i=0; retModels && retModels.length>i; i++)
                    models[i] = retModels[i];
                //$rootScope.$digest();
                logger.trace("Copied server data to placeholder")
            },  errorHandler);
            return models;
        };
        
        function errorHandler(err){
            console.error("$query/$get error: ", err);
            // if(true) return
            // var action = 'throw';
            // try{
                // var $ui = $injector.get("$ui");
                // action = $ui.config("$query-error") || action;
                // if(action == 'alert'){
                    // var alerts = $injector.get("$alert");
                    // alerts && alerts.error(err);    
                // } 
            // }
            // catch(ex){
            // }
            // if(action === 'throw')  throw err;
        }
    }
})();

// testing functions
function $anget(serviceName){
    return angular.element(document).injector().get(serviceName)
}