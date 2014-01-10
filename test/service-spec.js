
var ROOT = process.cwd();
var path= require("path")
var fs = require("fs");
var logging = require("log4js");
var angoose = require("../lib/angoose");
angoose.init();
require("jasmine-custom-message");
var Actual = jasmine.customMessage.Actual;
  
describe("Angoose Model Tests", function(){
    it("Sample Service Schema", function(done){
        var SampleService = angoose.getClass("SampleService");
        console.log("SCHEMA", SampleService.getSchema());
        var places = new SampleService().listFavoriteDestinations();
        console.log("Places", places);
        expect(new Actual(places[0], "SampleService.listFavoriteDestination failed")).toBe("Paris");
        done();
    });
     
}); 
