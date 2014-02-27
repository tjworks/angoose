var ROOT = process.cwd();
var assert = require("assert");
var path= require("path");
var http = require("http");
var fs = require("fs");
var express = require("express");
var request = require('request');
var logging = require("log4js");
var async = require("../lib/util/toolbox").async;
var _ = require("underscore");
  
var util = require("./test-util");
var Actual = util.Actual;

var MyError = function(message, value){
    this.name = 'My Error';
    this.message = message;
    this.value = value;
};
var donedone = false;
var mongoose = require("mongoose")

var angoose = util.initAngoose();
xdescribe("Context with Mongoose parallel hooks", function(){
    // this cannot be run with other tests for now
    var testSchema = mongoose.Schema({
        name:String
    });
    testSchema.pre('save', true,  function(  next, done){
        next();
       angoose.getContext()
       console.log("CONTEXT 2 OK");
       angoose('TestUser').findOne({x:1}, function(err, re){
            angoose.getContext()
            console.log("CONTEXT 2.1 OK");
            done();    
       });
    });
    testSchema.pre('save', true, function(next, done){
       next();
       angoose.getContext()
       console.log("CONTEXT 3 OK"  );
       angoose('TestUser').findOne({x:2},   angoose.inContext( function(err, re){
            angoose.getContext()
            console.log("CONTEXT 3.1 OK");
            done();    
       })); 
    });
    angoose.module('TestUser', mongoose.model('TestUser', testSchema));
    
    it("Parallel hooks", function(done){
        var TestUser = angoose.client(true).module("TestUser");
        var su = new TestUser({ name: 'Gaelyn' });
        su.save(function(err, data){
            assert(!err);
            console.log("Got Result", err, data, su)
            done(); 
            // TestUser.remove({}, {multi:true}, function(){
                // done();
            // })
        });
    });
    
});
xdescribe("Context with simple Mongoose hooks", function(){
    var testSchema = mongoose.Schema({
        name:String
    });
    testSchema.pre('save',   function(  next){
       angoose.getContext();
       console.log("CONTEXT 1 OK");
       angoose('TestUser2').findOne({x:11}, function(err, re){
            angoose.getContext();
            console.log("CONTEXT 1.1 OK"); 
            next();    
       });
    }); 
    angoose.module('TestUser2', mongoose.model('TestUser2', testSchema));
    
    it("Simple Mongoose hooks", function(done){
        var TestUser = angoose.client(true).module("TestUser2");
        var su = new TestUser({ name: 'Gaelyn' });
        su.save(function(err, data){
            assert(!err);
            console.log("Got Result", err, data, su)
            done(); 
            // TestUser.remove({}, {multi:true}, function(){
                // done();
            // })
        });
    });
    
});
describe("Context with nested mongoose callback", function(){
    it("Nested callback test", function(done){
        var TestUser = angoose.client(true).module("SampleUser");
        TestUser.findOne({x:100}, function(err, u){
            angoose.testContext("Callback 1")
            mongoose.model("SampleUser").findOne({x:200}, function(err, u){
                angoose.testContext("Callback 2")
                angoose.getContext();
                assert(!err);
                mongoose.model("SampleUser").findOne({x:300}, function(err, u){
                    angoose.testContext("Callback 3")
                    angoose.getContext();
                    assert(!err);
                    done();
                })
            })
        })
    });
    
});
describe("Angoose Context Tests", function(){
    var SampleUser =  mongoose.model('SampleUser');
    var user = null;
    beforeEach(function(done){
        util.addUser(SampleUser, function(err, u){
            user = u;
            done();
        });
    });
    xit("MongoDB callback domain bind test", function(done){
        
        //console.log("MyService", angoose.module('MyService'));
        var invocation = {
            seqnumber: 1001,
            method:'findOne',
            static:true,
            clazz: 'SampleUser',
            args: [  ]
        };
        var ctx = new angoose.Context({request:{value:123}, res:{}});
        angoose.execute(ctx, invocation, function(data){
            var count = 0; var completed = 0;
            function CB(name){
                console.log("in funciton callback",name, ++completed, " of ", count);
                assert.equal(name, true);
                if(completed == count){
                    assert.equal(completed, count, "FF32")
                    done();  
                } 
            };
            GLOBAL.CB= CB;
            GLOBAL.angoose = angoose;
 
            function wrapper(name ){
                var fn = "console.log(err,result); angoose.getContext();CB('"+name+"') "
                return new Function('err', 'result', name, fn);
            }
            var statics  = 'find,findOne,findById,update,count,geoNear,geoSearch'.split(',');
            _.each(statics, function(method){
                console.log("Calling method", method, ++count);
                SampleUser[method]({_id: user._id},  wrapper(method ));
            });
            
            //'find findOne update remove count distict findAndModify aggregate';
            user.email=new Date().getTime() +"dd@demo.com"; 
            ++count;SampleUser.findOneAndUpdate({_id: user._id}, {email:user.email}, wrapper('findOneAndUpdate'));
            
            ++count;user.save(  wrapper('save'));            
            ++count;SampleUser.remove({_id: user._id}, wrapper('remove'));
            ++count;SampleUser.aggregate([{$match:{}}], wrapper("aggregate"));
            ++count;SampleUser.geoNear([20,20], wrapper("geoNear"));
            
        });
    });
      
    it("Execution Context", function(done){
        console.log("Execution context test");
        
        var SampleService = angoose.client().module("SampleService");
        SampleService.testExecutionContext().done(function(data){
            console.log("Got context path", data)
            assert.equal( data, 'testExecutionContext');
            done();
        }, function(err){
            
        });
    });
   
    
    
});  

