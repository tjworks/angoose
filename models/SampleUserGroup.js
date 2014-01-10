var mongoose = require('mongoose');
var SampleSchema = mongoose.Schema({
        name:  {type: String, required: true, unique:true},
        description:  {type: String }
    },
    {
        collection:'SampleGroups'
    }
);
 
var SampleUserGroup = mongoose.model('SampleUserGroup', SampleSchema);
module.exports = SampleUserGroup;

