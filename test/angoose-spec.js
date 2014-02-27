var ROOT = process.cwd(),assert= require("assert");
var path= require("path")
var http = require("http");
var fs = require("fs");
var express = require("express");
var request = require('request');
var logging = require("log4js");
var logger = logging.getLogger('angoose');


var util = require("./test-util");


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
            assert.equal(suser.password, "abcsalt123");
            assert.equal(res, "Password changed");
            done();
        });
    }); 
      it("Static method", function(done){
        var SampleUser = AngooseClient.getClass("SampleUser");
        SampleUser.checkExists('newmeil@he.com').done(function(exists){
            console.log("Done done", arguments);
            assert.equal(exists, false);
            done();
        });
    }); 
      it("Sample Service", function(done){
        var SampleService = AngooseClient.getClass("SampleService");
        SampleService.listFavoriteDestinations().done(function(places){
            console.log("Places", places);
            assert(places && places[0], "Paris");
            done();
        });
    });
    
    it("Test Promise", function(done){
        var SampleService = AngooseClient.getClass("SampleService");
        SampleService.testPromiseReturn().done(function(res){
            assert.equal(res, "PromiseOK");
            done();
        })
    })
   
});
