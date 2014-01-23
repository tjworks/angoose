
var ROOT = process.cwd();
var path= require("path")
var fs = require("fs");
var logging = require("log4js");
var angoose = require("../lib/angoose");
angoose.init();
require("jasmine-custom-message");
var Actual = jasmine.customMessage.Actual;
  
describe("Angoose Remotable Tests", function(){
    it("Inheritance Test", function(done){
        var modelClass = angoose.Model;
        var model = new modelClass({});
        console.log("Model instanceof Model", (model instanceof angoose.Remotable))
        var isSubclass = (model instanceof angoose.Remotable);
        expect( new Actual(isSubclass, "model should be a subclass of Remotable") ).toBeTruthy();
        expect(new Actual(model.getContext, "getContext method not defined") ).toBeTruthy();
        done()
    });
    it("getContext negative test", function(){
        try{
            angoose.getContext();
            expect(new Actual(false, "getContext should throw error")).toBe(true);     
        }
        catch(err){
        }
    }); 
    it("Remotable class", function(){
       var obj = angoose.Service.extend({}, {name:'Testie'});
       var clz = obj._angoosemeta.baseClass;
       expect( new Actual(clz, "class should be Service, but got "+ clz)).toBe("Service"); 
    });
    
    it("Automatic registering", function(){
        angoose.Service.extend({}, {name:'Testie'});
        var clz = angoose.getClass("Testie")
        console.log(clz, "CLZ")
        var name = clz&& clz._angoosemeta && clz._angoosemeta.name;
        expect( new Actual(name, "Service Testie not found in registry " + name)).toBe("Testie");
    });
    it("getContext on mongoose model", function(){
        var clz = angoose.getClass("SampleUser")
        var user = new clz({
            email:'hello@he.com'
        });
        expect( new Actual(user.getContext, "Mongoose model should have getContext instance method")).toBeTruthy();
        expect( new Actual(clz.getContext, "Mongoose model should have getContext static method")).toBeTruthy();
    });
}); 
