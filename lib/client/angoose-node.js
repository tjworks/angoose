/** Angoose Client for Node.js */

(function(){
    if(typeof exports =="undefined") return;
    console.log("##### Angoose node client Loading");
    var request = require('request');
    var Q  = require("q");
    var _ = require("underscore")
    var HTTP_BASE =  "http://localhost:9988"; // +( AngooseClient.configs.httpPort ?(":"+ AngooseClient.config.httpPort):"");
    var $httpDelegate = {}
    var methods = ['get', 'post','put','delete'];
    // create deletage functions over request module
    var createFunc = function(method){
        return function(url, data, callback){
            console.log("Sending thtp request", url)
            var options = {url:  HTTP_BASE + url, method:method, jar:true , json:true};
            if(data && typeof(data) != 'function' ) 
                options.json = data;
            else{
                callback = data;
            } 
            var deferred = Q.defer();
            request(options, function(err, res, body){
                if(err) 
                    deferred.reject(new Error(err));
                else
                    deferred.resolve(body);
                if(callback) callback(err, body);
            });
            return deferred.promise;
        }
    }
    _.each(methods, function(method){
        $httpDelegate[method] = createFunc(method);
    })
       
    AngooseClient.init({
        http: $httpDelegate,
        promise:Q
    });     
})()
