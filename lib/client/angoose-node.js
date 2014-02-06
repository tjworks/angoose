/** Angoose Client for Node.js */

(function(){
    if(typeof exports =="undefined" || typeof require == 'undefined') return;
    console.log("##### Angoose node client Loading");
    var Q  = require("q");
    AngooseClient.init({
        //http: realHttp(),
        http:mockHttp(),
        promise:Q
    });
    
    function realHttp(){
        var request = require('request');
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
        return $httpDelegate;
           
    }
    function mockHttp(){
        var httpMock = require("node-mocks-http");
        var mock = {};
        var session = {};
        mock.post = function(url, data){
            var deferred = Q.defer();
            
            var request= httpMock.createRequest({
                    url: url,
                    method:'POST',
                    params: {
                        method: data.method,
                        model: data.clazz
                    }, 
                    session:session
            });
            request.body = data;
            var mockUser = {
                    _id: '52c44dd0ecafbf1a9a000002',
                    username:'Gaelyn',
                    email:'gaelyn@demo.com',
                    roles:'admin',
                    type:'admin'
               }
            // /** session */
           // request.session = {
               // user: mockUser,
               // userObj: mockUser
           // }
           var response = httpMock.createResponse();
           response.send = function(code, data){
               data = JSON.parse( JSON.stringify(data) );
               deferred.resolve(data);
           }
           var ROOT = process.cwd();
           var angoose = null;
           if(require("fs").existsSync(ROOT+"/lib/angoose.js"))
                angoose = require(ROOT+"/lib/angoose");
           else {
                angoose = require("angoose");
           }
               
           
           angoose.rmiAccept(request, response);
           return deferred.promise;
        }
        return mock    
    }

    module.exports = AngooseClient;         
})()
