// ## Toolbax
// 
// Utility functions

// **async**
//
// Wrap a function so that it is called asynchronously. 
// This is necessary to ensure a call back is always asynchronous.
exports.async = function async(fn, scope){
    return function(){
        var args = arguments
        process.nextTick(function(){
            fn.apply(scope, args)    
        })
    }
};


exports.patchQ = function(){
        
    /** Workaround for Q module with CLS */
    function matroshka(fn) {
      var babushka = fn;
      Object.keys(process.namespaces).forEach(function (name) {
        babushka = process.namespaces[name].bind(babushka);
      });
    
      return babushka;
    }
    function patchQueue() {
      var Q = require('q');
      var proto = Q && Q.makePromise && Q.makePromise.prototype;
      function wrapperFunc(then) {
        return function nsThen(fulfilled, rejected, progressed) {
          if (typeof fulfilled === 'function') fulfilled = matroshka(fulfilled);
          if (typeof rejected === 'function') rejected = matroshka(rejected);
          if (typeof progressed === 'function') progressed = matroshka(progressed);
          return then.call(this, fulfilled, rejected, progressed);
        };
      }
      require("shimmer").wrap(proto, 'then', wrapperFunc);
      require("shimmer").wrap(proto, 'done', wrapperFunc);
    }
    
    patchQueue();

};

exports.patchMongoCallback = function(){
	var mongodbs = [];
	try{
		mongodbs.push( require("mongoose/node_modules/mongodb/lib/mongodb/db").Db );
	}
	catch(err){}
	try{
		mongodbs.push( require("mongodb/lib/mongodb/db").Db );
	}
	catch(err){}
	
	for(var i=0;i<mongodbs.length;i++){
		var mongodb = mongodbs[i];
		mongodb.prototype._executeInsertCommand = bindMongoCallback(mongodb.prototype._executeInsertCommand);
		mongodb.prototype._executeQueryCommand = bindMongoCallback(mongodb.prototype._executeQueryCommand);
		mongodb.prototype._executeUpdateCommand = mongodb.prototype._executeInsertCommand ;
		mongodb.prototype._executeRemoveCommand = mongodb.prototype._executeInsertCommand ;
	}
	
	function bindMongoCallback(fn){
		return function(cmd, options, callback){
			var domain = require("domain");
			if(domain.active){
				if(typeof(callback) ==='function') callback = domain.active.bind(callback);
				else if(!callback && typeof(options) === 'function') options = domain.active.bind(options);
			}
			fn.call(this, cmd, options,callback  );
		};
	};

};