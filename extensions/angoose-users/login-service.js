 /** @module LoginService */
var angoose =require('../../lib/angoose');  //@TODO: should be able to use require("angoose") if the extension is individual module
var crypto = require("crypto");
var UserModel = require("./user-model");
var service = {};

function logger(){
    return angoose.getLogger("angoose-users");
}
/**
 * User login
 * 
 */
service.signin = function(username, password, $callback){
     var $context = angoose.getContext();
     if (! username || ! password) return $callback("Must provide username/password");
     
     UserModel.findOne({"email":  username },  function(err, user) {
                if (err) return $callback(err);
                if(!user){
                    logger().debug("user ", username, "does not exist");
                    return $callback("Username/password do not match.");   
                }
                logger().debug("User login: ", username, password && password.length, user.get("password.salt"))
                
                //var hashedPassword = require("crypto").pbkdf2Sync(password);
                var hashedPassword = password;
                
                if(user.password !== hashedPassword){
                    logger().debug("user ", username, "password did not match");
                    return $callback("Username/password do not match.");
                }
                // A login module must: 1) Implement a signin method 2) callback with an object with userId and roles properties
                user.userId = user._id;
                user.roles = user.roles; 

                // keep user in session, optional
                $context.getRequest().session.user = user;
                $callback(false, user);
        }); // end inContext
}

/** 
 * Signout
 * 
 */
service.signout = function(  $callback){
    var $context = angoose.getContext();
    $context.getRequest().session.user = null;
    $callback(false);
}
 

module.exports = angoose.module('LoginService', service);
