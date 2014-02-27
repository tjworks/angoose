var ROOT = process.cwd();
var assert = require("assert");
var path= require("path")
var fs = require("fs");
var logging = require("log4js");
require("jasmine-custom-message");


var util = require("./test-util");
var angoose = util.initAngoose();
  
describe("Angoose Schema Tests", function(){
    
    it("Check mongoose model schema correctness", function(done){
        var su = angoose.client().module('SampleUser');
        var schema = su.schema;
        assert(schema.statics.find, "SampleService.extend should be defined")
        done();
    });
    
    
}); 

describe("Mongoose Schema Tests", function(){
    it("Find method should exist", function(done){
        var su = angoose.client().module('SampleUser');
        var schema = su.schema;
        assert( schema.statics.find, "SampleService.extend should be defined");
        done();
    });
    it("Schema paths should exist", function(done){
        var su = angoose.client().module('SampleUser');
        var schema = su.schema;
        assert(schema.paths && schema.paths.email, "schema paths should exists for the models");
        done();
    });
    
    it("Schema validators should not be exported yet", function(done){
        var su = angoose.client().module('SampleUser');
        var schema = su.schema;
        if(schema.paths)
            assert(! schema.paths.email.validators);
        else
            assert.fail("No paths found")
        done();
    });
    it("Schema path type should not be function", function(done){
        var su = angoose.client().module('SampleUser');
        var schema = su.schema;
        if(schema.paths)
            assert.equal(typeof(  schema.paths.email.options.type) , 'string');
        else
            assert.fail("No paths found 2") ;
        done();
    });
});


describe("Function type tests", function(){
    it("Portable function should be executed client side", function(done){
        var SU = angoose.client().module('SampleUser');
        util.addUser(SU, function(err, user){
            var ret =  user.getFullname() ;
            console.log("Getfulname", ret);
            assert.equal( typeof(ret), "string");
            done();
        });
    });
    
})
