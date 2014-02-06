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
    
    this.setUser = function(user){
        this.user = user;
    }
    this.getUser = function(){
        return this.user;
    }
    
    this.setPrincipal = function(principal){
        props.principal = principal;
    }
    // not used yet
    this.getPrincipal = function(){
        if(props.principal) return props.principal;
        return new Principal();
    }
    
    this.toString = function(){
        return "[Context@"+ this.seqnum+"]"
    }
}

module.exports = Context;