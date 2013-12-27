var ROOT = process.cwd();
var Q = require("q");
var mongoose = require('mongoose');
var UserSchema = mongoose.Schema({
        meta: {
            email:  {type: String, required: true, match: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,4}$/i, index:true},
            phone:  {type: String, required: false},
            firstname: String,
            lastname: String
        },
        status: {type: String, enum: ['inactive', 'active', 'disabled', 'archived'], required:true, def:'inactive' },
        pwd: { type:String, required:true, def:'default-password'},
        salt:String,
    },
    {
        collection:'users', 
        discriminatorKey: 'type'
    }
);
UserSchema.methods.getFullname= function(){
    /**@angoose-method-portable*/
    console.log("getFullname", this);
    return this.meta && (this.meta.firstname ? this.meta.firstname +" ": "") + (this.meta.lastname || "");
}
UserSchema.methods.setFullname= function(fullname){
    /**@angoose-method-server*/
    console.log("in setFullname", fullname);
    var names = (fullname || "").split(/\s+/);
    if(names.length!=2) return;
    this.meta = this.meta || {};
    this.meta.firstname = names[0];
    this.meta.lastname = names[1];
}
UserSchema.methods.resetPassword = function(){
    /**@angoose-method-server*/
    var out = Q.defer();
    var name = this.getFullname();
    logger.debug("reseting password for ", this.getFullname())
    if(this.isNew){
        out.reject("User is new");
        return out.promise;  
    } 
    fs.readFile(clientfile, function(err, content){
        out.resolve("File write OK");
    })
    return out.promise;
}


module.exports = mongoose.model('User', UserSchema);
