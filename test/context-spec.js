var ROOT = process.cwd();
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

var angoose = util.initAngoose();
AngooseClient = util.angooseClient();

var MyError = function(message, value){
    this.name = 'My Error';
    this.message = message;
    this.value = value;
};

var donedone = false;
var mongoose = require("mongoose")
var SampleUser =  mongoose.model('SampleUser');
describe("Angoose Local Storage Tests", function(){
    var user = null;
    beforeEach(function(done){
        util.addUser(SampleUser, function(err, u){
            user = u;
            done();
        });
    });
    it("MongoDB callback domain bind test", function(done){
        
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
                expect(name).toBeTruthy();
                if(completed == count){
                    expect(completed).toBe(count)
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
        
        var SampleService = AngooseClient.getClass("SampleService");
        SampleService.testExecutionContext().done(function(data){
            console.log("Got context path", data)
            expect(new Actual(data, "Execution context expecting 'testExecutionContext'  but got: "+ data)).toBe('testExecutionContext');
            done();
        }, function(err){
            
        });
    });
   
    
    
});  

