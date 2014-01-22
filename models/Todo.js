var angoose = require("../lib/angoose"); /** if angoose is installed as module, then require('angoose')*/
var mongoose = angoose.getMongoose();
var todoSchema = mongoose.Schema({
       title: { type: String, required: true},
       completed: Boolean
    });  
module.exports = mongoose.model('Todo', todoSchema);
