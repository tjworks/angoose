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
  