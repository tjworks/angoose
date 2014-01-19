// ### API References

var Principal = require("./Principal");
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