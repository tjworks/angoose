var angoose =require('../../lib/angoose');  //@TODO: should be able to use require("angoose") if the extension is individual module
var crypto = require("crypto");
var mongoose = angoose.getMongoose();
var options = {
    MODEL_NAME: 'AngooseUser',
    COLLECTION_NAME: 'angoose_users'
}
var UserSchema = new mongoose.Schema({
                email: {type: String, required: true, label: 'Email', match:[/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,4}/i, "Email is not valid"], unique:true, tags:['default-list']},
                name: {
                    first: {type: String,   label: 'First Name' },
                    middle: {type: String, label: 'Middle Name'},
                    last: {type: String,   label: 'Last Name'  }
                },
                status: {
                    type: String,
                    required: true,
                    label: 'Status',
                    enum:['active','disabled','archived'],
                    default:'active',
                    tags:['default-list']
                },
                password: {type:String, required:true, label:'Password' },
                roles:{type:String, enum:[ 'admin','manager','content-admin', 'user' ], default:'user', label:'User Role', required:true, tags:['default-list']} // the roles are sample ones
        } , {collection: options.COLLECTION_NAME, label:'User'});
        
UserSchema.pre('save', function(next){
    if(this.isModified('password')){
        //this.password = crypto.pbkdf2Sync(this.password)
    } 
    next();
});      
module.exports =  mongoose.model( options.MODEL_NAME, UserSchema);


// create a default user

var adminUser = {
    email:'admin@demo.com',
    password:'demo',
    name: {
        first:'Admin', last:'Demo'
    },
    status:'active',
    roles:'admin'
}
setTimeout(function(){
    var UserModel=  mongoose.model(options.MODEL_NAME);
    UserModel.findOne({email: adminUser.email}, function(err, user){
        if(user) return;
        var u = new UserModel(adminUser);
        u.save(function(err){
            console.log("Add default admin user result:", err);
        });
    })
},1000);
