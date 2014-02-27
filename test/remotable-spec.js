var ROOT = process.cwd();
var assert =require('assert');
var path= require("path")
var fs = require("fs");
var logging = require("log4js");
var angoose = require("../lib/angoose");
angoose.init();
require("jasmine-custom-message");
  
describe("Angoose Remotable Tests", function(){
    it("Inheritance Test", function(done){
        var modelClass = angoose.Model;
        var model = new modelClass({});
        console.log("Model instanceof Model", (model instanceof angoose.Remotable))
        var isSubclass = (model instanceof angoose.Remotable);
        assert(  isSubclass);
        done()
    });
    it("getContext negative test", function(){
        try{
            angoose.getContext();
            assert.equal( false,true);     //, "getContext should throw error"
        }
        catch(err){
        }
    }); 
    it("Remotable class", function(){
       var obj = angoose.Service.extend({}, {name:'Testie'});
       var clz = obj._angoosemeta.baseClass;
       assert.equal(  clz,"Service"); // , "class should be Service, but got "+ clz)
    });
    
    // xit("Automatic registering", function(){
        // angoose.Service.extend({}, {name:'Testie'});
        // var clz = angoose.getClass("Testie")
        // console.log(clz, "CLZ")
        // var name = clz&& clz._angoosemeta && clz._angoosemeta.name;
        // assert.equal( new Actual(name, "Service Testie not found in registry " + name),"Testie");
    // });
    it("getContext on mongoose model", function(){
        var clz = angoose.getClass("SampleUser")
        var user = new clz({
            email:'hello@he.com'
        });
        assert(  clz.getContext);//, "Mongoose model should have getContext static method")
    });
}); 
