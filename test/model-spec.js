var ROOT = process.cwd();
var path= require("path")
var fs = require("fs");
var logging = require("log4js");
var util = require("./test-util");
var traverse = require("traverse");
var angoose = util.initAngoose();
require("jasmine-custom-message");
var Actual = jasmine.customMessage.Actual;
var userdata =  util.testuser;
var AngooseClient = angoose.client();
describe("Angoose Model Tests", function(){
    it("Test Dirty", function(done){
        var SampleUser = AngooseClient.getClass('SampleUser');        
        util.addUser(SampleUser, function(err, user){
            console.log("user", user)
            var lastname = "User"+new Date().getTime();
            user.lastname = lastname;
            user.save(function(err, res){
                console.log('after save', user.lastname);
                done();
            });
        })
    });   
    
    it("Partial Loading", function(done){
        var SampleUser = AngooseClient.getClass('SampleUser');
        util.addUser(SampleUser, function(err, u){
            SampleUser.findOne({firstname: util.testuser.firstname}, 'firstname', function(err, user){
                console.log("User", user);
                expect(user.firstname).toBeTruthy();
                expect(user.lastname).toBeUndefined();
                done()        
            })
        });
        
    })
    
    it("validation error test backend only", function(done){
        console.log("validation error tests");
        var SampleUser = angoose.getClass("SampleUser");
        var suser = new SampleUser( userdata);
        suser.email = 'john@test.org'
        suser.save(function(err, res){
            console.log("Office save result", err);
            expect(err +" backedn").toContain("don't like");
            done();
        })
    });

});


describe("Model save validations", function(){
    
    it("Sample User Find", function(done){
        var SSU = require(ROOT+ "/models/SampleUser");
        
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
    
   xit("Sample User Save", function(done){
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
    
     
    xit("validation error test", function(done){
        console.log("validation error tests");
        var SampleUser = AngooseClient.getClass("SampleUser");
        var suser = new SampleUser( userdata);
        suser.email = 'john@test.org'
        suser.save(function(err, res){
            console.log("Office save result", err);
            expect(err +" clientside").toContain("don't like");
            setTimeout(done, 500)
        })
    });

    
}) ;

describe("", function(){
     it("Sample User Groups", function(done){
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
                if(!grps ){
                    expect('no groups').toBe("test groups");
                    return done();
                }
                 var suser = new SampleUser( userdata);
                 suser.email = new Date().getTime() + suser.email;
                 suser.groupRef =  grps[0]._id;
                 
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
})
 
