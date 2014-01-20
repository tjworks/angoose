var angoose = require("../lib/angoose");
var Q = require("q");
var service = {
    listFavoriteDestinations: function(){
        return ["Paris", "Virgin Islands", "Antarctic"]
    },
    testExecutionContext: function remote(){
        var req = this.getContext().getRequest();
        return req.params['method'];
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