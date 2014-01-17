
var ROOT = process.cwd();
var path= require("path")
var fs = require("fs");
var logging = require("log4js");
var angoose = require("../lib/angoose");
angoose.init();
require("jasmine-custom-message");
var Actual = jasmine.customMessage.Actual;
var userdata = { 
    firstname:'Gaelyn', 
    lastname:'Hurd',
    status:'active',
    email:'gaelyn@hurd.com'
};


function addUsers(cb){
        var clz = angoose.getClass("SampleUser");
        userdata.email="user1@gmail.com";
        var user1 = new clz(userdata);
        user1.save(function(err, saved){
            console.log("user 1 added", err)
            userdata.email="user2@gmail.com";
            var user2 = new clz(userdata); 
            user2.save(function(err, saved2){
                console.log("user 2 added ", err);
                
                cb(err, user1, user2)    
                
                
                
            })
        })
}

function removeUsers(user1, user2, done){
    
    user2.remove(function(err, d){
        console.log("user 2  removed ", err);
        user1.remove(function(err, d2){
            console.log("user 1 removed")
            done();
        })
    })
}
describe("Angoose Model Tests", function(){
    it("Model.pre handler", function(done){
        var User = angoose.getClass("SampleUser");
//         
        // User.preQuery('find', function(findArguments){
            // var query =  findArguments.length && findArguments[0];
            // query = query || {};
            // query.email = 'user1@gmail.com';
            // console.log("preQuery handler #1", query);
            // arguments[0] = query;
        // })
//         
        
        addUsers(function(err, user1, user2){
                if(err) {
                    return expect(err).toBeUndefined();
                }
                
                User.find({'status':'active'}, function(err, users){
                    console.log("Found users", users);
                    removeUsers(user1, user2, done);
                })
            
        })
        
    });   
}); 
