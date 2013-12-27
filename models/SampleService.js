var mongoose = require('mongoose') 
var SampleServiceSchema = mongoose.Schema({
});

SampleServiceSchema.statics.listFavoriteDestinations = function(){
    // return a list of users]
    return ["Paris", "Virgin Islands", "Antarctic"]
}
module.exports = mongoose.model('SampleService', SampleServiceSchema);
