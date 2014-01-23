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
       it("Sample User Find", function(done){
        var SSU = require(ROOT+ "/models/SampleUser");
        
        eval(clientSource);
        var SampleUser = AngooseClient.getClass("SampleUser");
        
        expect(SampleUser.save).not.toBeTruthy()
        expect(SampleUser.find).toBeTruthy()
        expect(SampleUser.findOne).toBeTruthy()
        
        var suser = new SampleUser( userdata);
        expect(suser.remove).toBeTruthy()
        suser.save().done(function(res){
                console.log("Expecting save OK: ", res);
                
                SSU.findById( suser._id ).exec(function(err, obj){
                    console.log("server object find",err,  obj);
                    
                    SampleUser.findById( suser._id ).done(function(su){
                        console.log("Expecting findById OK: ", su);
                        done();
                    }, function(err){
                        console.log("Failed to find ", err);
                        expect(err).toBe("OK");
                        done();
                    })
                });
                
                // now trying to find one
                //SampleUser.find()
        })
    });
    it("Sample User Save", function(done){
        eval(clientSource);
        var SampleUser = AngooseClient.getClass("SampleUser");
        
        expect(SampleUser.save).not.toBeTruthy()
        
        var suser = new SampleUser( userdata);
        expect(suser.remove).toBeTruthy()
        suser.email = 'john@'
        suser.save(function(err, res){  // can either user callback for promise
            console.log("Expecting save error : ", err, res);
            expect(err).toBeTruthy();
            if(!err) return done();
            err && expect(err.indexOf('email')).toBeGreaterThan(0);
            suser = new SampleUser( userdata);
            suser.save().done(function(res){
                console.log("Expecting save OK: ", res);
                
                SampleUser.find({email:suser.email}).done(function(su){
                    console.log("Expecting find OK: ", su);
                    expect(su && su.length).toBe(1)
                    if(!su || !su.length) return done();
                    var foundUser = su[0];
                    foundUser.email = 'Invalid';
                    foundUser.save(function(err, res){
                        console.log("Expect saving invalid foundUser to fail:", err);
                        expect(err).toBeTruthy();
                        
                        foundUser.remove().done(function(res){
                            console.log("Expecting remove() to be OK:", res);
                            done();
                        }, function(er){
                            console.log("Failed to remove", er);
                            expect(err).toBe("OK");                        
                        });    
                    })
                        
                }, function(err){
                    console.log("Failed to find ", err);
                    expect(err).toBe("OK");
                    done();
                })
                // now trying to find one
                //SampleUser.find()
                
                
            }, function(er){
                console.log("Unexpected error: ", er);
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

 