var angoose = require("../lib/angoose");
var mongoose = angoose.getMongoose();
var SampleSchema = mongoose.Schema({
        email:  {type: String, required: true, match: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,4}$/i, unique:true},
        firstname: {type: String, required:true },
        lastname: {type: String, required:true },
        status: {type: String, enum: ['inactive', 'active', 'disabled', 'archived'], required:true, def:'inactive' },
        password: { type:String },
        verified: Boolean,
        groupRef: {type: mongoose.Schema.Types.ObjectId, ref: 'SampeUserGroup'}
    },
    {
        collection:'SampleUsers', 
        discriminatorKey: 'type'
    }
);
var sampleUserData = { 
    firstname:'Gaelyn', 
    lastname:'Hurd',
    status:'active',
    email: 'gaelyn@hurd.com',
};

SampleSchema.methods.getFullname= function portable(){
    //_instance_portable
    console.log("getFullname", this);
    return  (this.firstname ? this.firstname +" ": "") + (this.lastname || "");
}
SampleSchema.methods.setPassword= function(newPassword, $context, $callback){
    // instance method, reset user's password.
    if(!$callback ) throw "$callback not injected";
    if(!$context) throw "$context not injected";
    //var cryptor = require("crypto"); // require node module crypto
    //this.password = cryptor.encrypt("salt", newPassword);
    this.password  = newPassword +"salt123"; // fake code
    $callback(false, "Password changed");
}
SampleSchema.statics.getSample = function(){
    // this should refer to the model class
    console.log("get sample user");
    var instance = new this( sampleUserData); 
    return instance;
    
}
SampleSchema.statics.checkExists = function(email){
    //_static_remote
    console.log("in checkExists",email);
    require("fs");  // do a server side operation to ensure this can only be done in the server side.
    if(email && email.indexOf('new')>=0) return false;
    return true;
}
var SampleUser = mongoose.model('SampleUser', SampleSchema);
module.exports = SampleUser;

SampleSchema.path('email').validate(function(value, respond){
    if(value && value.indexOf(".org")>0){
        process.nextTick(function(){
            respond(false)    
        })
    }
    else
        respond(true);
}, "I don't like .org emails")
