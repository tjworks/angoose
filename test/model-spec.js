var ROOT = process.cwd();
var assert = require("assert");
var path= require("path")
var fs = require("fs");
var logging = require("log4js");
var util = require("./test-util");
var traverse = require("traverse");
var angoose = util.initAngoose();
require("jasmine-custom-message");
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
                assert(user.firstname );
                assert(!user.lastname, "user.lastname should be unset");
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
            assert((err +" backedn").indexOf("don't like"));
            done();
        })
    });

});


describe("Model save validations", function(){
     var SSU = require(ROOT+ "/models/SampleUser");
    var SampleUser = AngooseClient.getClass("SampleUser");
    beforeEach(function(done){
        SSU.remove(function(){
            done();   
        });
    });
    it("Sample User Find", function(done){
        assert(!SampleUser.save) 
        assert(SampleUser.find)
        assert(SampleUser.findOne)
        
        var suser = new SampleUser( userdata);
        assert(suser.remove)
        suser.save( function(res){
                console.log("Expecting save OK: ", suser._id);
                SSU.findById( suser._id ).exec(function(err, obj){
                    if(!obj) {
                        assert.fail("Created user not found");
                        done();
                    }
                    SampleUser.findById( suser._id ).done(function(su){
                        console.log("Expecting findById OK: ", su);
                        done();
                    }, function(err){
                        assert.fail("Failed to find "+ err);
                        done();
                    })
                });
                
                // now trying to find one
                //SampleUser.find()
        } )
    });
    
   xit("Sample User Save", function(done){
        var SampleUser = AngooseClient.getClass("SampleUser");
        
        assert(!SampleUser.save, "save function should not be available on constructor");
        
        var suser = new SampleUser( userdata);
        assert.equal(suser.remove, true)
        suser.email = 'john@'
        suser.save(function(err, res){  // can either user callback for promise
            console.log("Expecting save error : ", err, res);
            assert.equal(err, true);
            if(!err) return done(); 
            assert(err && (err+"").indexOf('email'));
            suser = new SampleUser( userdata);
            suser.save().done(function(res){
                console.log("Expecting save OK: ", res);
                SampleUser.find({email:suser.email}).done(function(su){
                    console.log("Expecting find OK: ", su);
                    assert.equal(su && su.length,1)
                    if(!su || !su.length) return done();
                    var foundUser = su[0];
                    foundUser.email = 'Invalid';
                    foundUser.save(function(err, res){
                        console.log("Expect saving invalid foundUser to fail:", err);
                        assert.equal(err, true);
                        
                        foundUser.remove().done(function(res){
                            console.log("Expecting remove() to be OK:", res);
                            done();
                        }, function(er){
                            console.log("Failed to remove", er);
                            assert.equal(err,"OK");                        
                        });    
                    })
                        
                }, function(err){
                    console.log("Failed to find ", err);
                    assert.equal(err,"OK");
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
            assert((err +" clientside").indexOf("don't like"));
            setTimeout(done, 500)
        })
    });

    
}) ;

describe("", function(){
     it("Sample User Groups add and save", function(done){
        var SampleUser = AngooseClient.getClass("SampleUser");
        var SampleUserGroup = AngooseClient.getClass("SampleUserGroup");
        var group = new SampleUserGroup({
            name:'testgroup'
        });
        group.save(function(err, res){
            console.log("save group", err, group);
            if(err && (err+"").indexOf("duplicate")<0){
                assert(!err);
                done()
            }
            else SampleUserGroup.find({"name":"testgroup"}, function(err, grps){
                if(!grps ){
                    assert.equal('no groups',"test groups");
                    return done();
                }
                 var suser = new SampleUser( userdata);
                 suser.email = new Date().getTime() + suser.email;
                 suser.groupRef =  grps[0]._id;
                 
                 console.log("Saving user with group", grps[0], grps[0].find);
                 suser.save(function(err, res){
                     console.log("Saved user with group", err, res)
                     assert(!err);
                     if(err) done();
                     else suser.remove(function(reError, reRes){
                        console.log("Removeing user", reError, reRes)
                        assert(!reError)
                        done();    
                     })
                     
                 })   
            })
             
        })
    });
})
 
