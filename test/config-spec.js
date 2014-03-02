var ROOT = process.cwd()
var assert = require("assert");;
var path= require("path")
var fs = require("fs");
var logging = require("log4js");
var util = require("./test-util");
var angoose = util.initAngoose();
var toolbox = require("../lib/util/toolbox");

describe("Config test", function(){
    var SU = angoose.module("SampleUser");
    SU.config("a.b-c.c", 3);
    
    it("Setting module configuration ", function(){
        assert.equal(SU.config("a.b-c").c,3);
        assert.equal(SU.config("a.b-c.c"),3)
    });
}); 
  
describe("angoose.config tests", function(){
   
   it("config get", function(){
       assert(typeof(angoose.config()) === 'object', "config() returns object");
    });
    
    it("dotted pattern getter and setter", function(){
        angoose.config("a.b-c.c", 3);
        assert.equal(angoose.config("a.b-c").c,3);
        assert.equal(angoose.config("a.b-c.c"),3)
    });
    
    it("config merge", function(){
        angoose.config({a:1, b:{ c: 3 }});
        angoose.config({a:5, b:{ d: 4 }});
        assert.equal( angoose.config('b.c'), 3) ;
        assert.equal( angoose.config('b.d'), 4) ;
        assert.equal( angoose.config('a'), 5);
    });
});
