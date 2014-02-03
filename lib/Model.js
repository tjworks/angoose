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

// ### API References
//

 
module.exports = Model;
// 
// function getData(doc, path){
    // if(!path || !doc) return undefined;
     // var   pieces = path.split('.');
      // var obj = doc;
      // for (var i = 0, l = pieces.length; i < l; i++) {
        // obj = undefined === obj || null === obj
          // ? undefined
          // : obj[pieces[i]];
      // }
      // return obj;
// }
// 
// function setData(doc, path, val){
    // if(!path || !doc ) return;
     // var   pieces = path.split('.');
      // var obj = doc;
      // for (var i = 0, len = pieces.length; i < len; i++) {
          // if(i+1  == len ) // last one
          // {
              // obj[ pieces[i]] = val;
              // return;
          // }
          // obj[pieces[i]] = obj[pieces[i]] || {};
          // obj = obj[pieces[i]] || {};
      // }
// }