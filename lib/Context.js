// ### API References

var Principal = require("./Principal");
var seqnum = 100;
function Context(properties){
    this.seqnum =  properties.seqnum || (++seqnum);
    var props = properties;
    
    this.request = props.request;
    this.response = props.response;
    
    
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
    
    // ** getInvocation **
    //
    // Returns the invocation object associated with current context
    this.getInvocation = function(){
        return this.invocation;
    }
    
    this.setUser = function(userId, username, roles){
        this.setPrincipal( new Principal(userId, username, roles))
    }
    this.setPrincipal = function(principal){
        props.principal = principal;
    }
    //
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
    
    this.toString = function(){
        return "[Context@"+ this.seqnum+"]"
    }
}

module.exports = Context;