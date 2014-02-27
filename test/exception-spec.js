var assert = require("assert");
var ROOT = process.cwd();

var Exception = require("../lib/Exception");

describe("Test Exception Types", function(){
    it("Exception name default", function(done){
        var ex = new Exception("Something wrong" );
        assert(ex instanceof Error)
        assert(!ex.name)
        assert.equal(ex+"" , "Something wrong");
        assert.equal(ex.message, "Something wrong");
        done();
    });
});

describe("Test exception with name", function(){
    it("Exception name should be set", function(done){
        var ex = new Exception("Something wrong" , 'MyError');
        assert(ex instanceof Error) 
        assert.equal(ex.name, "MyError");
        assert.equal(ex.message, "Something wrong");
        done();
    });
});


describe("Test new exception with error", function(){
    it("Exception with existing error", function(done){
        var ex = new Exception(new Error('Something wrong'), 'MyError'); 
        assert(ex instanceof Error);
        assert.equal(ex.name, "MyError");
        assert.equal(ex.message, "Something wrong");
        done();
    });
});
 


describe("Test exception JSON", function(){
    it("Exception JSON", function(done){
        var ex = new Exception("HELLO");
        assert.equal(JSON.stringify(ex),'{"message":"HELLO","name":""}');
        done();
    });
});
 