var util = require("util");

function Exception(err, name){
    if(err instanceof Error){
        this.message = err.message;
        this.name = name || err.name;
        require('traverse')(err).forEach(function(){
            if(this.circular) this.remove();
        })
        this.cause = err;
        //this.cause = err;
        //delete this.cause.domain;  
    } 
    else{
        this.message = err;
        this.name =  name || '';    
    } 
}
util.inherits(Exception, Error);
module.exports = Exception;

 