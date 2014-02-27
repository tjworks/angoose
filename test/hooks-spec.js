var ROOT = process.cwd();
var assert = require("assert");
var path= require("path")
var http = require("http");
var fs = require("fs");
var _ = require("underscore");
var express = require("express");
var request = require('request');
var logging = require("log4js");
var logger = logging.getLogger('angoose');
require("jasmine-custom-message");
var preCompileCalled = false,postCompileCalled=false;
var util = require("./test-util");

//require("./server"); //.startServer(configs);
var userdata =  util.testuser;
// these tests cannot be run together with others 
console.log("****** TEST: hooks-spec ***** ");
var angoose = require("../lib/angoose");
 
describe.skip("Hook tests", 
    function(){   
        var flag = flagB = flagC =  {};
        
        var hk = {
            preAuthorize: function(next, invocation, callback){
                console.log("in preAuthorize hook", arguments)
                //expect(flag).toBe("init")
                flag.hook = 'pre';
                next();
            },
            postAuthorize: function(next, invocation, callback){
                console.log("in postAuthorize hook", arguments);
                // why post hook is receiving the invocation arguments?
                //expect(flag).toBe("preauthorize")
                flag.hook = 'post';
                flag.postauth = invocation.method;
                //next(new Error("post bad"));
                next();
            },
            postInvoke: function(next){
                //console.log("POST INVOKE", arguments);
                next();
            }
        }
        describe("Hooks Sequence Tests", function(){
            console.log("****** TEST: Hook sequence-test starts ***** ");
            
            beforeEach(function(){
                flag = {};
            })
            
            
            
            // IMPORTANT: post hooks will be bypassed if main method returns error
            // IMPORTANT: post hooks will be called with main method arguments if no error
            // hooks must return new Error() to report error 
         
            it("PostHooks with arguments", function(done){
                angoose.extension('HookTestA', hk)        
                angoose = util.initAngoose(null, null, true);
                
                
                var service =  angoose.client().module('SampleService');
                service.listFavoriteDestinations(function(err, places){
                    console.log("places", err, places);
                    assert.equal(flag.postauth, 'listFavoriteDestinations');
                    done();    
                });
            });
            it("Hook sequence", function(done){
                var SU =  angoose.client().module('SampleUser');
                SU.findOne(function(err, u){
                    assert.equal(flag.hook ,'post');
                    done();    
                });
            });
            
            it("Post Hook with error", function(done){
                var SS =  angoose.client().module('SampleService');
                SS.testErrorBack(function(err, u){
                    console.log("post hook", err, u)
                    assert(err)
                    done();    
                });
            });
        });
        
        
        describe("Before After Tests", function(){
            console.log("****** TEST: before after tests starts ***** ");
            beforeEach(function(){
                flag = {};
            });
            hkB = _.clone(hk);
            hkB.beforeAuthorize = hkB.preAuthorize;
            delete hkB.preAuthorize;
            hkB.afterAuthorize = hkB.postAuthorize;
            delete hkB.postAuthorize;
            
            
            // IMPORTANT: post hooks will be bypassed if main method returns error
            // IMPORTANT: post hooks will be called with main method arguments if no error
            // hooks must return new Error() to report error 
            // 
            it("PostHooks with arguments", function(done){
                angoose.extension('HookTestB', hkB)        
                angoose = util.initAngoose(null);
            
                var service =  angoose.client().module('SampleService');
                service.listFavoriteDestinations(function(err, places){
                    console.log("places", err, places);
                    assert.equal(flag.postauth, 'listFavoriteDestinations');
                    done();    
                });
            });
            it("Hook sequence", function(done){
                var SU =  angoose.client().module('SampleUser');
                SU.findOne(function(err, u){
                    assert.equal(flag.hook,'post');
                    done();    
                });
            });
            
            it("Post Hook with error", function(done){
                var SS =  angoose.client().module('SampleService');
                SS.testErrorBack(function(err, u){
                    console.log("post hook", err, u)
                    assert (err)
                    done();    
                });
            });
        });
        
        describe("Client hooks - synchronized only", function(){
            flag = {};
            flag.sequence= '';
            function genFunc(hook){
                console.log("create hook func for ", hook)
                var f = function(next){ console.log("In hook ------------", hook);  flag[hook] = hook;  flag.sequence+= " -> " + hook;  }
                f.name = "HookTest"+hook;
                return f;
            }
            
            var hookables = 'GenerateClient,ConfigClient,ExportModules,ExportModule,CreateBundle'.split(",");
            var plugin = {};
            hookables.forEach(function(hookable){
                var hook = 'pre'+ hookable; 
                plugin[hook] = genFunc(hook);
                var hook2 = 'after'+ hookable; 
                plugin[hook2] = genFunc(hook2);
            });
                 
            // IMPORTANT: prehook must call next(), while post hook doesnt' have to
            // IMPORTANT: post hooks will be bypassed if main method returns error
            // IMPORTANT: post hooks will be called with main method arguments if no error
            // hooks must return new Error() to report error 
            
              it("PostHooks synchronized", function(done){
                    angoose.extension('HookTestC', plugin)
                    angoose = util.initAngoose(null, null, true);
                    //angoose.client(true);
                    console.log("Hook sequence is", flag);
                
                  
                  hookables.forEach(function(hookable){
                        var hook = 'pre'+ hookable;
                        assert.equal(flag[hook], hook); 
                        var hook = 'after'+ hookable;
                        assert.equal(flag[hook], hook); 
                    });
                done();              
                // var service =  angoose.client().module('SampleService');
                // service.listFavoriteDestinations(function(err, places){
                    // console.log("places", err, places, flag);
                    // expect(flag.beforeGenerateClient).toBeTruthy();
                    // expect(flag.postConfigClient && flag.postConfigClient.options.urlPrefix).toBeTruthy();
                    // expect(flag.postExportModules).toBe("postExportModules has run")
                    // done();    
                // });
            });
        });
        
    }
);

 

