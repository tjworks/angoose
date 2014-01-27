var ROOT = process.cwd();
var path= require("path")
var http = require("http");
var fs = require("fs");
var express = require("express");
var request = require('request');
var logging = require("log4js");
var async = require("../lib/util/toolbox").async;
  
var localStorage = require('continuation-local-storage');
var session = localStorage.createNamespace('Session');


var util = require("./test-util");
var Actual = util.Actual;

var angoose = util.initAngoose();
var clientSource = util.clientSource();


var MyError = function(message, value){
    this.name = 'My Error';
    this.message = message;
    this.value = value;
}

process.on('uncaughtException',function(e) {
    var sys = require("sys");
    sys.log(" Unhandled Error in local-storage test -----> : " + e.stack);
    if(e instanceof MyError){
        e.value();
    }
});


var donedone = false;
describe("Angoose Local Storage Tests", function(){
    xit("Test context", function(done){
        // no longer use local-storage        
        for(var i=0;i<5;i++){
            console.log("setting up "+i)
            session.run(function(){
                setUp( i+1, doWork);    
            })
        }
        setTimeout(function(){
            if(donedone)
                console.log("Good");
            else
                expect("Incomplete").toBe("Completed");
            done();
        }, 15)
    });
     xit("Test async context lost", function(done){
        
        var fn = function(){
            var s = localStorage.getNamespace("Session2")
            expect(s.get("val")).toBe(1);
            console.log("async func test called, val should be 1, got", s.get("val"));
            done();
        }
        var sess = localStorage.createNamespace('Session2');
        sess.run(function(){
            sess.set("val", 1);
            var f = async(async(async(async(async(async(fn))))));
            async(async(async(f)))();
        })
    });
     
    it("Execution Context", function(done){
        console.log("Execution context test");
        eval(clientSource);
        var SampleService = AngooseClient.getClass("SampleService");
        SampleService.testExecutionContext().done(function(data){
            console.log("Got context path", data)
            expect(new Actual(data, "Execution context expecting 'testExecutionContext'  but got: "+ data)).toBe('testExecutionContext');
            done();
        }, function(err){
            
        })
    });
   
    
    
}); 
function setUp(val, func){
    session.set("count", val );
    process.nextTick(func)
}

function doWork(){
    var session = localStorage.getNamespace('Session');            
    console.log("COUNT", session.get("count"));
    var count = session.get("count");
    if(count>=4){
        console.log("DONE!");
        donedone = true;
    }             
}
