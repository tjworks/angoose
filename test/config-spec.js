var ROOT = process.cwd();
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
        expect(SU.config("a.b-c").c).toBe(3);
        expect(SU.config("a.b-c.c")).toBe(3)
    });
}); 
  