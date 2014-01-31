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
    if(typeof angular =='undefined'){
        console.log("No angular")
        return;  
    } 
    console.log("##### Angoose Client Loading");
    var angularModule =  angular.module("angoose.client", []);
    AngooseClient.client='angular';
    
    // ** angoose **
    //
    //  You may require `angoose` client as an injectable
    //  
    angularModule.factory('angoose', function($http, $q){
            var myQ = addDoneMethod($q);
            AngooseClient.init({
                http:angularHttpWrapper($http, myQ),
                promise: myQ
            });
            return AngooseClient;
    })
    function factoryFunc(modelName){
        console.log("Create factory for model "+ modelName)
        angularModule.factory(modelName , function($http, $q, $rootScope, $timeout, angoose){
            var acModel = AngooseClient.model(modelName);
            resourceAdapt(acModel, $rootScope, $timeout);
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
    function angularHttpWrapper($http, $q){
        var ret = {};
        ret.post = function(){
            var deferred = $q.defer();
            $http.post.apply($http, arguments).success(function(data){
                deferred.resolve(  data );
            }).error(function(err){
                deferred.reject(err);
            });
            return deferred.promise;
        }
        return ret;
    }
    function resourceAdapt(modelClass, $rootScope, $timeout){
        // now adpat to angular resource
        modelClass.$get= function(){
            if(!modelClass.findOne) throw "Model does not support findOne operation";
            var modelInstance = new modelClass();
            $timeout(function(){
                modelClass.findOne.apply(modelClass, arguments).done(function(object){
                    // the return data should be a model instance
                    modelInstance.mergeData(object);
                    //$rootScope.$digest();
                    console.log("Copied server data to placeholder", modelInstance)
                }, function(err){
                    console.error("Unable to load server data", err);
                });    
            }, 1) ;
            
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
                console.log("Copied server data to placeholder")
            }, function(err){
                console.error("Unable to load server data", err);
            });
            return models;
        };
    }
})();

// testing functions
function $anget(serviceName){
    return angular.element(document).injector().get(serviceName)
}