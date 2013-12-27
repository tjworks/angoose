// depdnencies: http, Q
/****** Angular Adapter for Angoose Client *******/
(function(){
    if(typeof angular =='undefined') return;
    console.log("##### Angoose Client Loading");
    var angulrModule =  angular.module("angoose.client", []);
    function factoryFunc(modelName){
        console.log("Create factory for model "+ modelName)
        angulrModule.factory(modelName , function($http, $q, $rootScope){
            AngooseClient.init({
                http:angularHttpWrapper($http),
                promise:$q
            });
            var acModel = AngooseClient.model(modelName);
            resourceAdapt(acModel, $rootScope);
            return acModel;
        });
    }
    angular.forEach( AngooseClient.modelNames(), factoryFunc );
    
    function angularHttpWrapper($http){
        var ret = {};
        ret.post = function(){
            var deferred = Q.defer();
            $http.post.apply($http, arguments).success(function(data){
                deferred.resolve(data);
            }).error(function(err){
                deferred.reject(err);
            });
            return deferred.promise;
        }
        return ret;
    }
    function resourceAdapt(modelClass, $rootScope){
        // now adpat to angular resource
        modelClass.__proto__.$get= function(){
            if(!modelClass.findOne) throw "Model does not support find operations";
            var modelInstance = new modelClass(); 
            modelClass.findOne.apply(modelClass, arguments).done(function(object){
                // the return data should be a model instance
                modelInstance.mergeData(object);
                $rootScope.$digest();
                console.log("Copied server data to placeholder", modelInstance)
            }, function(err){
                console.error("Unable to load server data", err);
            });
            return modelInstance;
        };
        modelClass.__proto__.$query=function(){
            
        };
    }
})();


