var logger = require("log4js").getLogger("angoose");

//  This is currently not used as of 0.2.14
//
// This class encapsulates authenticated user information. 
// To obtain an instance of this object, you may use `getContext` method
// defined on the Model/Service class or instance:
//
//     MySchema.methods.updateStatus = function(){
//          var user = this.getContext().getPrincipal();
//          console.log("User is ", user.getUsername());     
//     }
//
// 

// ### API References


var  Principal = function(userId, roles){
    var user = {
        userId: userId,
        //username: username,
        roles: Array.isArray(roles)?roles: (roles?[roles]:undefined)
    }
    // ** getUsername() **
    // 
    // get current logged in user's name/login
    //this.getUsername = function(){ return user.username};

    // ** getRoles **
    //
    // get current logged in user's roles, always returns an array
    this.getRoles = function(){ return user.roles || [] };
    
    // ** getUserId **
    //
    // get current logged in user's ID
    this.getUserId = function(){ return user.userId};
};

module.exports = Principal;