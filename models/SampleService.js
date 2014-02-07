var angoose = require("../lib/angoose");
var Q = require("q");
var SampleService =  function(){};
SampleService.listFavoriteDestinations= function(){
        return ["Paris", "Virgin Islands", "Antarctic"]
    }
SampleService.testExecutionContext= function remote($callback){
        var self = this;
        var su = require("./SampleUser");
        su.findOne(angoose.bind(   function(err, res){
                var ctx = self.getContext();
                console.log("In testExecutionContext "+ ctx.seqnum)
                var req = ctx.getRequest();
                $callback(false, req.params['method']);
        }))
}
// static method
SampleService.testPromiseReturn=function(){
    console.log("testPromiseReturn!");
    var out = Q.defer();
    out.resolve("PromiseOK");
    process.nextTick(function(){
        out.resolve("PromiseOK");
    })
    return out.promise;
}

SampleService.testErrorBack = function($callback){
    console.log("In testErrorCallback");
    $callback("Error in testError");
} 
module.exports = angoose.module('SampleService',  SampleService);
