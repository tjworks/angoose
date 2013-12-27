var mongoose = require('mongoose'), Q = require("q"); 
var SampleSchema = mongoose.Schema({
        email:  {type: String, required: true, match: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,4}$/i, index:true},
        firstname: {type: String, required:true },
        lastname: {type: String, required:true },
        status: {type: String, enum: ['inactive', 'active', 'disabled', 'archived'], required:true, def:'inactive' },
        password: { type:String, required:true },
    },
    {
        collection:'SampleUsers', 
        discriminatorKey: 'type'
    }
);
SampleSchema.methods.getFullname= function(){
    /**@angoose-method-portable*/
    console.log("getFullname", this);
    return  (this.firstname ? this.firstname +" ": "") + (this.lastname || "");
}
SampleSchema.methods.setFullname= function(fullname){
    /**@angoose-method-server*/
    console.log("in setFullname", fullname);
    var names = (fullname || "").split(/\s+/);
    if(names.length!=2) return;
    this.firstname = names[0];
    this.lastname = names[1];
}

module.exports = mongoose.model('SampleUser', SampleSchema);
