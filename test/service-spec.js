
var ROOT = process.cwd();
var path= require("path")
var fs = require("fs");
var logging = require("log4js");
var angoose = require("../lib/angoose");
angoose.init();
require("jasmine-custom-message");
var Actual = require("./test-util").Actual;
  
describe("Angoose Service Tests", function(){
    it("Sample Service Schema", function(done){
        var SampleService = angoose.getClass("SampleService");
        console.log("SCHEMA", SampleService.getSchema());
        var places =   SampleService .listFavoriteDestinations();
        console.log("Places", places);
        expect( places[0] ).toBe("Paris");
        done();
    });
    // it("Create service class", function(){
       // var obj = angoose.service('Testie', {
           // testme: function(){ return 'hello' }
       // });
       // var clz = angoose.getClass('Testie');
       // expect( new Actual(new clz().testme(), "Register object as service failed")).toBe("hello"); 
    // });
//     
    it("Create service class using module", function(){
        var func = function(){ console.log("testie2")}
        func.testme = function(){ return 'hello2'};
       var obj = angoose.module('Testie2',  func);
       var clazz = angoose.module('Testie2'); 
       expect(  clazz.testme() ).toBe("hello2"); //, "Register function as a service failed" 
    });
    
    it("Create service object using module", function(){
        var service =   { testme: function(){ return 'hello2'} };
       var obj = angoose.module('Test3',  service);
       var clazz = angoose.module('Test3'); 
       expect(  clazz.testme() ).toBe("hello2"); //, "Register function as a service failed" 
    });
}); 
