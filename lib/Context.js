var Principal = require("./Principal");
// # Context
// 
// Angoose supports an execution context feature that allows you to access some contextual state from any part of the code,
// as long as the code execution was originated by Angoose RMI handler. 
//
// All the Model/Service classes come with an instance method `getContext` to obtain the Context object. You may also
// call `angoose.getContext` to do the same. 



function Context(properties){
    var props = properties;
    // ** getRequest() ** 
    //
    // Returns the express request object
    this.getRequest = function(){
        return props.request;
    }
    this.getResponse = function(){
        return props.response;
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