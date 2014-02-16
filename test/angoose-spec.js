var ROOT = process.cwd();
var path= require("path")
var http = require("http");
var fs = require("fs");
var express = require("express");
var request = require('request');
var logging = require("log4js");
var logger = logging.getLogger('angoose');


var util = require("./test-util");
var Actual = util.Actual;


//require("./server"); //.startServer(configs);
var userdata =  util.testuser;
console.log("****** TEST: angoose-spec ***** ");

describe("Core Tests", function(){
     var angoose = util.initAngoose();
     var AngooseClient = util.angooseClient();
    it("Dependency injection", function(done){
        var SampleUser = AngooseClient.getClass("SampleUser");
        var suser = new SampleUser( userdata);
        suser.setPassword('abc').done(function(res){
            console.log("setpassword done", arguments);
            expect(suser.password).toBe("abcsalt123");
            expect(res).toBe("Password changed");
            done();
        });
    }); 
      it("Static method", function(done){
        var SampleUser = AngooseClient.getClass("SampleUser");
        SampleUser.checkExists('newmeil@he.com').done(function(exists){
            console.log("Done done", arguments);
            expect(exists).toBe(false);
            done();
        });
    }); 
      it("Sample Service", function(done){
        var SampleService = AngooseClient.getClass("SampleService");
        SampleService.listFavoriteDestinations().done(function(places){
            console.log("Places", places);
            expect(places && places[0]).toBe("Paris");
            done();
        });
    });
    
    it("Test Promise", function(done){
        var SampleService = AngooseClient.getClass("SampleService");
        SampleService.testPromiseReturn().done(function(res){
            expect(res).toBe("PromiseOK");
            done();
        })
    })
   
});
