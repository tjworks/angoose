var mongoose = require('mongoose');
var SampleSchema = mongoose.Schema({
        email:  {type: String, required: true, match: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,4}$/i, unique:true},
        firstname: {type: String, required:true },
        lastname: {type: String, required:true },
        status: {type: String, enum: ['inactive', 'active', 'disabled', 'archived'], required:true, def:'inactive' },
        password: { type:String },
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
    email: 'gaelyn@hurd.com'
};

SampleSchema.methods.getFullname= function portable(){
    //_instance_portable
    console.log("getFullname", this);
    return  (this.firstname ? this.firstname +" ": "") + (this.lastname || "");
}
SampleSchema.methods.setFullname= function(fullname){
    //_instance_remote
    console.log("in setFullname", this, fullname);
    var names = (fullname || "").split(/\s+/);
    if(names.length!=2) return;
    this.firstname = names[0];
    this.lastname = names[1];
}
SampleSchema.statics.checkExists = function(email){
    //_static_remote
    console.log("in checkExists",email);
    require("fs");  // do a server side operation to ensure this can only be done in the server side.
    if(email && email.indexOf('new')>=0) return false;
    return true;
}
SampleSchema.statics.getSample = function(){
    // this should refer to the model class
    console.log("get sample user");
    var instance = new this( sampleUserData); 
    return instance;
    
}
var SampleUser = mongoose.model('SampleUser', SampleSchema);
module.exports = SampleUser;
