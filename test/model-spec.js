var ROOT = process.cwd();
var path= require("path")
var fs = require("fs");
var logging = require("log4js");
var util = require("./test-util");
var angoose = util.initAngoose();
require("jasmine-custom-message");
var clientSource = util.clientSource();
eval(clientSource);
var Actual = jasmine.customMessage.Actual;
var userdata =  util.testuser;

describe("Angoose Model Tests", function(){
    it("Test Dirty", function(done){
        var User = AngooseClient.getClass('SampleUser');  
        util.addUser(User, function(err, user){
            console.log("user", user)
            var lastname = "User"+new Date().getTime();
            user.lastname = lastname;
            user.save(function(err, res){
                console.log('after save', user.lastname);
                
                done();
            });
        })
    });   
}); 
