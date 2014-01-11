var Principal = require("./Principal");
// # Context
// 
// Angoose supports an execution context feature that allows you to access some contextual state from any part of the code,
// as long as the code execution was originated by Angoose RMI handler. This is made possible by  npm module `continuation-local-storage` 
//
// For each HTTP request, an unique Context object is created upon the start of the Angoose handling of the request. The context contains the request
// and response objects, as well as session and authenticated user info(TBD). The context can then be obtained via the `getContext` method from
// anywhere in the application, as long as the code path was originated from the Angoose. 
// 
// The `getContext`  method is available on all Angoose enhanced Model or Service classes as well as instances.  You may also
// call `angoose.getContext` to do the same. 
// 

function Context(properties){
    var props = properties;
    // ** getRequest() ** 
    //
    // Returns the express request object
    this.getRequest = function(){
        return props.request;
    }
    
    // ** getResponse **
    //
    // Returns the express response object
    this.getResponse = function(){
        return props.response;
    }
    
    // ** getSession **
    // 
    // Returns the current session object
    this.getSession = function(){
        return props.session;
    }
    
    // ** getPrincipal ** 
    //
    // Returns the [Principal](Principal.html) object representing currently logged in user
    this.getPrincipal = function(){
        if(props.principal) return props.principal;
        /** construct it from request */
        if(props.request && props.request.session && props.request.session.user){
             /**@todo: hacking for epf */
            var user = props.request.session.user;
            props.principal = new Principal(user._id, user.email, user.type);
        }
        return props.principal;   
    }
}

module.exports = Context;