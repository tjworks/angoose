
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
        var places = new SampleService().listFavoriteDestinations();
        console.log("Places", places);
        expect(new Actual(places[0], "SampleService.listFavoriteDestination failed")).toBe("Paris");
        done();
    });
     it("Create service class", function(){
       var obj = angoose.service('Testie', {
           testme: function(){ return 'hello' }
       });
       var clz = angoose.getClass('Testie');
       expect( new Actual(new clz().testme(), "class should be Service, but got "+ clz)).toBe("hello"); 
    });
    
}); 
