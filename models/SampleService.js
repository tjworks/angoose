var angoose = require("../lib/angoose");
var Q = require("q");
var service = {
    listFavoriteDestinations: function(){
        return ["Paris", "Virgin Islands", "Antarctic"]
    },
    testExecutionContext: function remote($callback){
        var self = this;
        var su = require("./SampleUser");
        su.findOne(angoose.inContext(   function(err, res){
                var ctx = self.getContext();
                console.log("In testExecutionContext "+ ctx.seqnum)
                var req = ctx.getRequest();
                $callback(false, req.params['method']);
        }))
    }
}
var SampleService = angoose.service('SampleService',  service);
module.exports = SampleService;

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