require("jasmine-custom-message");
var request = require("request");

var util = require("./test-util");
describe("Angoose Server Tests", function(){
     // this one cannot test with others
     xit("Load client file from http", function(done){
       require("./server"); //.startServer(configs);
       request('http://localhost:9988' +util.angooseOpts.urlPrefix+'/angoose-client.js', function(err, response, body){
            try{
                eval(body);
             }
             catch(er){
                 console.error("ERRORERRORERRORERRORERRORERRORERRORERRORv", body, er)
             }
            var SampleUser = AngooseClient.getClass("SampleUser");
            var suser = new SampleUser( util.testuser);
            assert.equal(suser.getFullname(),"Gaelyn Hurd");
            done();
       });
    }); 
}); 

