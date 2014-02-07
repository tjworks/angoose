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
// these tests cannot be run together with others 
console.log("****** TEST: hooks-spec ***** ");
var angoose = require("../lib/angoose");
if(!angoose.initialized){
    doTests();
}
function doTests(){   
    
    describe("Hooks Sequence Tests", function(){
        console.log("****** TEST: sequence-test starts ***** ");
        var flag = 'init';
        beforeEach(function(){
            flag = 'init';
        })
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
                },
                postInvoke: function(next){
                    console.log("POST INVOKE", arguments);
                    next();
                }
            }
        
        util.angooseOpts.extensions = hk;
        angoose = util.initAngoose(null, util.angooseOpts, true);
        
        it("Hook sequence", function(done){
            var SU =  angoose.client().module('SampleUser');
            SU.findOne(function(err, u){
                expect(flag).toBe('postauthorize');
                done();    
            });
        });
        
        it("Post Hook with error", function(done){
            var SS =  angoose.client().module('SampleService');
            SS.testErrorBack(function(err, u){
                console.log("post hook", err, u)
                expect(err).toBeTruthy();
                done();    
            });
        });
        
        
         xit("hooks registration", function(done){
            var angoose = util.initAngoose(null, {
                extensions: getInitHook() 
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
     
        
    });
    
}



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


 