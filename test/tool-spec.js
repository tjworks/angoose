var ROOT = process.cwd();
var assert = require("assert");
var path= require("path")
var fs = require("fs");
var logging = require("log4js");
var util = require("./test-util");
var traverse = require("traverse");

var toolbox = require("../lib/util/toolbox");
describe("Toolbox Merge test", function(){

        var fn = function(){};
        fn.x = 1;
        var src = {
            aa:10,
            a: {
                b: 1,
                bb: {
                    c:30 
                }  
            },
            f: fn
                 
        };
        var dst = {
            aa:2,
            a:{
                bb: {
                    cc:10,
                    c:5
                }
            },
            f: {
                x: 2
            }
        }
    
    toolbox.merge(dst, src);
    it("Merge data should override simple key ", function(){
        assert.equal(dst.aa,10);
    });
    it("Merge data should override nested key ", function(){
        assert.equal(dst.a.bb.c,30); // updated
        assert.equal(dst.a.bb.cc,10); // unchanged
    });
    it("Merge data should not traverse function property ", function(){
        assert.equal(dst.f.x,1); // unchanged
    });
}); 
  