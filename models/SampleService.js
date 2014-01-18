var angoose = require("../lib/angoose");

var service = {
    listFavoriteDestinations: function(){
        return ["Paris", "Virgin Islands", "Antarctic"]
    },
    testExecutionContext: function remote(){
        var req = this.getContext().getRequest();
        return req.params['method'];
    }
}
var SampleService = angoose.Service.extend( service, { name:'SampleService' });
module.exports = SampleService;
