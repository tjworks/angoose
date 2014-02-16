
var ROOT = process.cwd();

var Exception = require("../lib/Exception");

describe("Test Exception Types", function(){
    it("Exception name default", function(done){
        var ex = new Exception("Something wrong" );
        expect(ex instanceof Error).toBe(true)
        expect(ex.name).toBeFalsy();
        expect(ex+"" ).toBe("Something wrong");
        expect(ex.message).toBe("Something wrong");
        done();
    });
});

describe("Test exception with name", function(){
    it("Exception name should be set", function(done){
        var ex = new Exception("Something wrong" , 'MyError');
        expect(ex instanceof Error).toBe(true)
        expect(ex.name).toBe("MyError");
        expect(ex.message).toBe("Something wrong");
        done();
    });
});


describe("Test new exception with error", function(){
    it("Exception with existing error", function(done){
        var ex = new Exception(new Error('Something wrong'), 'MyError'); 
        expect(ex instanceof Error).toBe(true)
        expect(ex.name).toBe("MyError");
        expect(ex.message).toBe("Something wrong");
        done();
    });
});
 


describe("Test exception JSON", function(){
    it("Exception JSON", function(done){
        var ex = new Exception("HELLO");
        expect(JSON.stringify(ex)).toBe('{"message":"HELLO","name":""}');
        done();
    });
});
 