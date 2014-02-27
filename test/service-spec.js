var ROOT = process.cwd();
var assert = require("assert");
var path= require("path")
var fs = require("fs");
var logging = require("log4js");
var angoose = require("../lib/angoose");
angoose.init();
require("jasmine-custom-message");
  
describe("Angoose Service Tests", function(){
    it("Sample Service Schema", function(done){
        var SampleService = angoose.getClass("SampleService");
        console.log("SCHEMA", SampleService.getSchema());
        var places =   SampleService .listFavoriteDestinations();
        console.log("Places", places);
        assert.equal( places && places[0], "Paris", "ListFavorite call failed");
        done();
    });
   
    it("Create service class using module", function(){
        var func = function(){ console.log("testie2")}
        func.testme = function(){ return 'hello2'};
       var obj = angoose.module('Testie2',  func);
       var clazz = angoose.module('Testie2'); 
       assert.equal(  clazz.testme(), "hello2"); //, "Register function as a service failed" 
    });
    
    it("Create service object using module", function(){
        var service =   { testme: function(){ return 'hello2'} };
       var obj = angoose.module('Test3',  service);
       var clazz = angoose.module('Test3'); 
       assert.equal(  clazz.testme() ,"hello2"); //, "Register function as a service failed" 
    });
}); 
