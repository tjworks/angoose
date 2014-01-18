require("jasmine-custom-message");
var request = require("request");
var Actual = jasmine.customMessage.Actual;
require("./server"); //.startServer(configs);
var util = require("./test-util");
var clientSource = util.clientSource; 
describe("Angoose Server Tests", function(){
     it("Load client file from http", function(done){
       request('http://localhost:9988' +util.angooseOpts.urlPrefix+'/angoose-client.js', function(err, response, body){
            eval(body);
            var SampleUser = AngooseClient.getClass("SampleUser");
            var suser = new SampleUser( util.testuser);
            expect(suser.getFullname()).toBe("Gaelyn Hurd");
            done();
       });
    }); 
}); 

