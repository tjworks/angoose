var ROOT = process.cwd();
var path= require("path")
var http = require("http");
var fs = require("fs");
var express = require("express");
var request = require('request');
var logging = require("log4js");
var logger = logging.getLogger('angoose');
require("jasmine-custom-message");
var Actual = jasmine.customMessage.Actual;


var preCompileCalled = false,postCompileCalled=false;
var util = require("./test-util");

//require("./server"); //.startServer(configs);
var userdata =  util.testuser;

describe("Hooks  Tests", function(){
    xit("hooks registration", function(done){
        var angoose = util.initAngoose(null, {
            hooks: getInitHook() 
        });
         angoose.compile();  
         expect(preCompileCalled).toBe('precompile called');
         expect(postCompileCalled).toBe('postcompile called');
         
         
         angoose.use(getSecondHook());
         angoose.compile(function(){
             console.log("completed compile in test")
             expect(preCompileCalled).toBe('precompile #2 called');
             expect(postCompileCalled).toBe('postcompile #2 called');
             done();    
         });  
         
    }); 
    
    it("try wrapper test", function(done){
        function fn(a){
            console.log("in function fn, going to throw", a);
            throw("bad girl")
            
        }
        function trywrapper(fn, scope){
            return function(){
                try{
                    fn.apply(scope, arguments);    
                }
                catch(ex){
                    console.log("Caught ex as expected",ex)
                    done();
                }
            }
        }
        
        trywrapper(fn)('hello');
        
    })
    it("Hook sequence", function(done){
        var flag = 'init';
        var hk = {
            name:'sequence-tester',
            preAuthorize: function(next){
                console.log("in preAuthorize hook")
                expect(flag).toBe("init")
                flag='preauthorize';
                next();
            },
            postAuthorize: function(next, allowed){
                console.log("in postAuthorize hook, allowed?", allowed);
                expect(flag).toBe("preauthorize")
                flag='postauthorize';
                next( false, true );
            }
        }
        util.angooseOpts.hooks = hk;
        angoose = util.initAngoose(null, util.angooseOpts);
        eval(util.clientSource());
        var SU = AngooseClient.getClass('SampleUser');
        SU.findOne(function(err, u){
            expect(flag).toBe('postauthorize');
            done();    
        });
    })
});


function getInitHook(){
    return {
        name:'test',
        preCompile: function(next){
            console.log("pre-compile hook fired")
            preCompileCalled = 'precompile called';
            next();
        },
        postCompile: function(next){
            console.log("post-compile ");
            postCompileCalled = 'postcompile called';
            next()
        }
    }
}
function getSecondHook(){
    return {
        name:'test2',
        preCompile: function(next){
            console.log("pre-compile #2 hook  ")
            preCompileCalled = 'precompile #2 called';
            next();
        },
        postCompile: function(next){
            console.log("post-compile #2 ");
            postCompileCalled = 'postcompile #2 called';
            next()
        }
    }
}
