
var ROOT = process.cwd();
var path= require("path")
var fs = require("fs");
var logging = require("log4js");
var angoose = require("../lib/angoose");
angoose.init();
require("jasmine-custom-message");
var Actual = jasmine.customMessage.Actual;
  
describe("Angoose Service Tests", function(){
    it("Sample Service Schema", function(done){
        var SampleService = angoose.getClass("SampleService");
        console.log("SCHEMA", SampleService.getSchema());
        var places =   SampleService .listFavoriteDestinations();
        console.log("Places", places);
        expect(new Actual(places[0], "SampleService.listFavoriteDestination failed")).toBe("Paris");
        done();
    });
    it("Create service class", function(){
       var obj = angoose.service('Testie', {
           testme: function(){ return 'hello' }
       });
       var clz = angoose.getClass('Testie');
       expect( new Actual(new clz().testme(), "Register object as service failed")).toBe("hello"); 
    });
    
    it("Create service ", function(){
        var func = function(){ console.log("testie2")}
        func.testme2 = function(){ return 'hello2'};
       var obj = angoose.module('Testie2',  func);
       var clz = angoose.module('Testie2'); 
       expect( new Actual( clz.testme2(), "Register function as a service failed")).toBe("hello2"); 
    });
}); 
