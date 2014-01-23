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
}


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

}
