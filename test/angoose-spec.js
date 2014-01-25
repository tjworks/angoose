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

var angoose = util.initAngoose();
//require("./server"); //.startServer(configs);
var userdata =  util.testuser;

var clientSource = util.clientSource();
describe("Angoose Server Tests", function(){
     
       it("Dependency injection", function(done){
        eval(clientSource);
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
        eval(clientSource);
        var SampleUser = AngooseClient.getClass("SampleUser");
        SampleUser.checkExists('newmeil@he.com').done(function(exists){
            console.log("Done done", arguments);
            expect(exists).toBe(false);
            done();
        });
    }); 
      it("Sample Service", function(done){
        eval(clientSource);
        var SampleService = AngooseClient.getClass("SampleService");
        new SampleService().listFavoriteDestinations().done(function(places){
            console.log("Places", places);
            expect(places[0]).toBe("Paris");
            done();
        });
    });
     it("Sample User Groups", function(done){
        eval(clientSource);
        var SampleUser = AngooseClient.getClass("SampleUser");
        var SampleUserGroup = AngooseClient.getClass("SampleUserGroup");
        var group = new SampleUserGroup({
            name:'testgroup'
        });
        group.save(function(err, res){
            console.log("save group", err, group);
            if(err && err.indexOf("duplicate")<0){
                expect(err).toBeUndefined();
                done()
            }
            else SampleUserGroup.find({"name":"testgroup"}, function(err, grps){
                 var suser = new SampleUser( userdata);
                 suser.email = new Date().getTime() + suser.email;
                 suser.groupRef = grps[0]._id;
                 
                 console.log("Saving user with group", grps[0], grps[0].find);
                 suser.save(function(err, res){
                     console.log("Saved user with group", err, res)
                     expect(err).toBeUndefined()
                     if(err) done();
                     else suser.remove(function(reError, reRes){
                        console.log("Removeing user", reError, reRes)
                        expect(reError).toBeUndefined();
                        done();    
                     })
                     
                 })   
            })
             
        })
    });
      
    
    
    
     it("Test Promise", function(done){
        eval(clientSource);
        var SampleService = AngooseClient.getClass("SampleService");
        SampleService.testPromiseReturn(function(err, res){
            expect(res).toBe("PromiseOK");
            done();
        })
    })
});

 