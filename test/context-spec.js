var ROOT = process.cwd();
var path= require("path")
var http = require("http");
var fs = require("fs");
var express = require("express");
var request = require('request');
var logging = require("log4js");
var async = require("../lib/util/toolbox").async;
  


var util = require("./test-util");
var Actual = util.Actual;

var angoose = util.initAngoose();
var clientSource = util.clientSource();


var MyError = function(message, value){
    this.name = 'My Error';
    this.message = message;
    this.value = value;
}
 


var donedone = false;
describe("Angoose Local Storage Tests", function(){
   
      
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

