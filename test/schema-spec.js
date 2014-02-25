
var ROOT = process.cwd();
var path= require("path")
var fs = require("fs");
var logging = require("log4js");
require("jasmine-custom-message");


var util = require("./test-util");
var angoose = util.initAngoose();
var Actual = util.Actual;
  
describe("Angoose Schema Tests", function(){
    it("Sample Service", function(done){
        var SampleService = angoose.module("SampleService");
        var schema = SampleService.getSchema();
        console.log("SCHEMA", schema);
        expect( schema.statics.extend).toBeFalsy(); //, "SampleService.extend should be undefined")
        done();
    });
    
    it("Check mongoose model schema correctness", function(done){
        var su = angoose.client().module('SampleUser');
        var schema = su.schema;
        expect(new Actual(schema.statics.find, "SampleService.extend should be defined")).toBeTruthy();
        done();
    });
    
    
}); 

describe("Mongoose Schema Tests", function(){
    it("Find method should exist", function(done){
        var su = angoose.client().module('SampleUser');
        var schema = su.schema;
        expect(new Actual(schema.statics.find, "SampleService.extend should be defined")).toBeTruthy();
        done();
    });
    it("Schema paths should exist", function(done){
        var su = angoose.client().module('SampleUser');
        var schema = su.schema;
        expect(schema.paths && schema.paths.email).toBeTruthy();
        done();
    });
    
    it("Schema validators should not be exported yet", function(done){
        var su = angoose.client().module('SampleUser');
        var schema = su.schema;
        if(schema.paths)
            expect( schema.paths.email.validators).toBeFalsy();
        else
            expect("No paths found").toBeNull();
        done();
    });
    it("Schema path type should not be function", function(done){
        var su = angoose.client().module('SampleUser');
        var schema = su.schema;
        if(schema.paths)
            expect(typeof(  schema.paths.email.options.type) ).toBe('string');
        else
            expect("No paths found").toBeNull();
        done();
    });
});


describe("Function type tests", function(){
    it("Portable function should be executed client side", function(done){
        var SU = angoose.client().module('SampleUser');
        util.addUser(SU, function(err, user){
            var ret =  user.getFullname() ;
            console.log("Getfulname", ret);
            expect( typeof(ret)).toBe("string");
            done();
        });
    });
    
})
