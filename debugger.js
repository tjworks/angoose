var ROOT=process.cwd();
console.log(ROOT);

require(ROOT+"/server/util/angoose-setup")();

var mongoose = require("mongoose");

var User = mongoose.model('User');
var Physician = mongoose.model('Physician');
User.findById('5296b80a888bfd8f05000008', function(err, user){
    console.log("user", user)
    console.log("User is user", user instanceof User);
    console.log("User is physician", user instanceof Physician);
})



