
var ROOT = process.cwd();
var path= require("path")
var fs = require("fs");
var logging = require("log4js");
var angoose = require("../lib/angoose");
angoose.init();
require("jasmine-custom-message");
var Actual = jasmine.customMessage.Actual;
  
describe("Angoose Schema Tests", function(){
    it("Sample Service", function(done){
        var SampleService = angoose.getClass("SampleService");
        var schema = SampleService.getSchema();
        console.log("SCHEMA", schema);
        expect(new Actual(schema.statics.extend, "SampleService.extend should be undefined")).toBeFalsy();
        done();
    });
}); 
