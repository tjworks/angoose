var ROOT = process.cwd();
var path= require("path")
var http = require("http");
var fs = require("fs");
var express = require("express");
var request = require('request');
var clientfile =  './build/generated-client.js';
var logging = require("log4js");
var logger = logging.getLogger('angoose');
logger.setLevel(logging.levels.TRACE);

require("jasmine-custom-message");
var Actual = jasmine.customMessage.Actual;

var configs = {
    modelDir: ROOT+'/models',
    clientFile: clientfile,
    urlPrefix: '/angoose',
    httpPort: 9988,
    mongo_opts:'localhost:27017/test'
}; 

 
var angoose = require("../lib/angoose"); 
var userdata = { 
    firstname:'Gaelyn', 
    lastname:'Hurd',
    status:'active',
    email:'gaelyn@hurd.com'
};  

function initAngoose(app){
    angoose.init(app, configs)
    return angoose;
}
module.exports = {
    
    clientSource: function(){
        return angoose.generateClient();
    },
    testuser:userdata,
    initAngoose: initAngoose,
    angooseOpts: configs
}


module.exports.addUser = function(SampleUser, cb){
    SampleUser.findOne({email: userdata.email}, function(err, res){
        if(!err && res)  return cb(err, res);
        var user1 = new SampleUser(userdata);
        user1.save(function(err, saved){
            if(err && err.indexOf("duplicate")) err=undefined;
            console.log("user 1 added", err)
            cb(err, user1 );    
        });    
    })
    
}
function addUsers(cb){
        var clz = AngooseClient.getClass("SampleUser");
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