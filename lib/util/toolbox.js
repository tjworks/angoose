// ## Toolbax
// 
// Utility functions


var _ = require("underscore");


exports.camelcase = function cammelcase(name, space){
    // converting client-user to ClientUser 
    if(!name) return name;
    var parts = name.split("-");
    name = "";
    for(var i=0;i< parts.length;i++){
        if(parts[i] && parts[i].length>0){
            name = name && space ? name+" ":name;
            name+= parts[i].substring(0,1).toUpperCase() + parts[i].substring(1);
        } 
    }
    return name;
}

exports.decamelcase = function decamelcase(name){
    // convert ClientUser to client-user 
    if(!name) return name;
    var ret = "";
    for(var i=0;i<name.length;i++){
        var c = name.charAt(i);
        if(c.toLowerCase() != c && ret.length>0) ret+="-"
        ret += c;
    }
    return ret.toLowerCase();
}

 
 
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


exports.getter = function (doc, path){
    if(!path || !doc) return undefined;
     var   pieces = path.split('.');
      var obj = doc;
      for (var i = 0, l = pieces.length; i < l; i++) {
        obj = undefined === obj || null === obj
          ? undefined
          : obj[pieces[i]];
      }
      return obj;
}

exports.setter = function(doc, path, val){
    if(!path || !doc ) return;
     var   pieces = path.split('.');
      var obj = doc;
      for (var i = 0, len = pieces.length; i < len; i++) {
          if(i+1  == len ) // last one
          {
              obj[ pieces[i]] = val;
              return;
          }
          obj[pieces[i]] = obj[pieces[i]] || {};
          obj = obj[pieces[i]] || {};
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

};

exports.patchMongoCallback = function(){
	var mongodbs = [];
	
	try{
        mongodbs.push( require(process.cwd() + "/node_modules/mongoose/node_modules/mongodb/lib/mongodb/db").Db );
    }
    catch(err){
    }
	try{
		mongodbs.push( require("mongoose/node_modules/mongodb/lib/mongodb/db").Db );
	}
	catch(err){
	}
	try{
        mongodbs.push( require("mongodb/lib/mongodb/db").Db );
    }
    catch(err){
    }
    try{
        mongodbs.push( require("../mongodb/lib/mongodb/db").Db );
    }
    catch(err){
    }
    
	for(var i=0;i<mongodbs.length;i++){
		var mongodb = mongodbs[i];
		mongodb.prototype._executeInsertCommand = bindMongoCallback(mongodb.prototype._executeInsertCommand);
		mongodb.prototype._executeQueryCommand = bindMongoCallback(mongodb.prototype._executeQueryCommand);
		mongodb.prototype._executeUpdateCommand = mongodb.prototype._executeInsertCommand ;
		mongodb.prototype._executeRemoveCommand = mongodb.prototype._executeInsertCommand ;
	}
	var domain = require("domain");
	function bindMongoCallback(fn){
		return function(cmd, options, callback){
			if(domain.active){
				if(typeof(callback) ==='function') callback = domain.active.bind(callback);
				else if(!callback && typeof(options) === 'function') options = domain.active.bind(options);
			}
			else{
			    //console.error("DOMAIN LOST", cmd.collectionName, cmd.query);
			}
			fn.call(this, cmd, options,callback  );
		};
	};

};

exports.bindCallback = function(scope, fn){
    return function(){
        var lastArg = arguments.length? arguments[arguments.length-1]: null;
        if(typeof(lastArg) != 'function') return fn.apply(scope || this, arguments);
        var domain =require("domain");
        if(domain.active){
            arguments[arguments.length-1] = domain.active.bind(lastArg);
        }
        return fn.apply(scope || this, arguments);
    }
}
exports.addHookPoints = function(clazz, hookables){
    var hooks = require("hooks");
    hookables = hookables || clazz.hookables;
    for (var k in hooks) { clazz[k] = hooks[k];}

    _.each(hookables, function(hookable){
        clazz.hook(hookable, clazz.prototype[hookable]);
    });
    clazz.removePost = removePost;
};

exports.removeHookPoints = function(clazz, hookables){
    hookables = hookables || clazz.hookables;
    _.each(hookables, function(hookable){
        clazz.removePre(hookable).removePost(hookable); 
    });    
};


function removePost(name, fnToRemove) {
    var proto = this.prototype || this
      , posts = proto._posts || (proto._posts || {});
    if (!posts[name]) return this;
    if (arguments.length === 1) {
      // Remove all pre callbacks for hook `name`
      posts[name].length = 0;
    } else {
      posts[name] = posts[name].filter( function (currFn) {
        return currFn !== fnToRemove;
      });
    }
    return this;
};







/**@todo move to schema util */


exports.parseDeclaredArguments = function(funcBody){
    if(typeof funcBody === 'function') funcBody = funcBody.toString();
    if(funcBody && typeof funcBody === "string"  && funcBody.substr(0,8) == "function") {
        var startArgs = funcBody.indexOf('(') + 1;
        var endArgs = funcBody.indexOf(')');
        return  funcBody.substring(startArgs, endArgs)
    }
    return "";
}
var FunctionNamePattern = /^function\s+(remote|local|portable)/i;
exports.typeOf = function(funcBody){
    funcBody = typeof(funcBody) == 'function' ? funcBody.toString() : funcBody;
    if(funcBody.indexOf("function")!=0) return "unknown";
    var matcher = FunctionNamePattern.exec(funcBody);
    return matcher? matcher[1]: 'remote'; //default is remote
}

exports.methodType = exports.typeOf;

exports.stringifySchema = function(schemaObj ){
    //logger.trace("stringifySchema", moduleName);
    var funcs = {};
    function funcStringifier(key, value) {
        if (typeof value !== 'function') return value;
        var body =  value.toString();
        var funcType = exports.typeOf(body);
        if(!funcType) return; //'not-available';
        if(funcType.indexOf("local")>=0) return 'This method can be invoked from server side only';
        
        if(funcType.indexOf("portable")>=0){
            /** the function can be executed client side */
           return body;
        }
        else{
            /** stub the function */
            return '$PROXIED$'; //constructProxyFunc(key,args, funcType);
        }
    }
    return JSON.stringify( schemaObj,  funcStringifier, "\t"  );
}

function getReference(pathSchema){
    var opts = pathSchema.options;
    
    /** Mongoose, array of ObjectIDs */
    if( Array.isArray(opts.type) && opts.type.length>0  &&  opts.type[0] && opts.type[0].ref ) 
        return opts.type[0].ref;
    /** Single ObjectID Reference*/
    if(pathSchema.instance == 'ObjectID' && opts.ref) return opts.ref;
    
    
    if(pathSchema.options.ref && pathSchema.instance == 'CustomRef'){
        /** deform custom ref*/
       return pathSchema.options.ref;    
    }
    /** deform rich reference, array */
    if(Array.isArray(opts.type ) && pathSchema.caster && 
            pathSchema.caster.instance == 'CustomRef' && pathSchema.caster.options.ref ){ 
        return pathSchema.caster.options.ref;
    }
        
    return null;
}

/**
 * Merge data recursively from src to dst, return dst
 * @param {Object} dst
 * @param {Object} src
 */
exports.merge = function(dst, src){
    dst = dst || {};
    src = src || {};
    var traverse = require("traverse");
    var source = traverse(src);
    var destination = traverse(dst);
    source.paths().forEach(function(path){
        var val = source.get(path);
        if(typeof(val) != 'object')
            destination.set(path, val);
    });
    return dst;
}

// Default implementation of exporting a module's methods to client
exports.exportModuleMethods = function(moduleName, mod){
    var ret = {};
    var schemaObj =  mod.schema || (mod.getSchema && mod.getSchema());
    if(!schemaObj)
        return null;  
    ret.moduleName = moduleName;
    ret.methods = _.clone( schemaObj.methods ) || {};
    ret.statics = _.clone( schemaObj.statics) || {};
    return ret;
};

