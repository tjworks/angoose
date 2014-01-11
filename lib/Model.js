var logger = require("log4js").getLogger("angoose");
var _ =require("underscore");
var Remotable = require("./Remotable")

// ## angoose.MODEL
// Model is one of two main artifacts in Angoose. Model classes define the data schema 
// as well as CRUD operations and other related functions. 
//
// Angoose Model is built on top of Mongoose model and adds a few capabilities to allow
// the remote invocation. To create a Model class, simply define a regular Mongoose model schema
// and export the Mongoose model class like below:  
//  
//
//      var mongoose = require('mongoose');
//      var SampleSchema = mongoose.Schema({
//          email:  {type: String, required: true},
//          firstname: {type: String, required:true },
//          lastname: {type: String, required:true },
//      })
//      module.exports = mongoose.model('SampleUser', SampleSchema);
//
//
// Requirements for creating models:
// - Model/schema file must be located under one of the `modelDir` directories.
// - Each file defines one model
// - `module.exports` must be set to the return value of `mongoose.model('name', schema)` call.

var Model = Remotable.extend({}, {baseClass: 'Model'});

Model.getSchema = function(){
    return this.schema;
}
module.exports = Model;