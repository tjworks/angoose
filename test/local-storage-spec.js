var ROOT = process.cwd();
var path= require("path")
var http = require("http");
var fs = require("fs");
var express = require("express");
var request = require('request');
var clientfile =  './build/generated-client.js';
var logging = require("log4js");
  
  
var localStorage = require('continuation-local-storage');
var session = localStorage.createNamespace('Session');

var donedone = false;
describe("Angoose Local Storage Tests", function(){
    it("Test context", function(done){
         // setup.js
        for(var i=0;i<10;i++){
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
}); 
function setUp(val, func){
    session.set("count", val );
    process.nextTick(func)
}

function doWork(){
    var session = localStorage.getNamespace('Session');            
    console.log("COUNT", session.get("count"));
    var count = session.get("count");
    if(count>=9){
        console.log("DONE!");
        donedone = true;
    }             
}