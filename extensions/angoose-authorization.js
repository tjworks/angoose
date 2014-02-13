var angoose = require("../lib/angoose");
var toolbox = require("../lib/util/toolbox");

var EXTENSION = 'angoose-authorization';
var AUTHMODEL  = 'PermissionModel';
var COLLECTION_NAME  = 'angoose_perms';

var cached = null;
module.exports = {
    name: EXTENSION,
    preAuthorize: preAuth,
    postAuthorize: postAuth,
    preRedact: redact,
    postInvoke: postInvoke,
    postSerializeModules: serializeModulesInterceptor,
    postGenerateClient: moduleSetup
};

function preAuth(next){
    logger().trace("in preAuth", session().$authenticatedUser);
    var authUser = session().$authenticatedUser;
    if(authUser){
        logger().trace("Found user in session",    authUser);
        //angoose.getContext().setUser( session().$authenticatedUser );
        angoose.getContext().setPrincipal( new angoose.Principal( authUser.userId, authUser.roles) );
    }  
    else{
        angoose.getContext().setPrincipal( new angoose.Principal( 'guest', 'guest' ));
    }
    next();
};
function logger(){
    var extensionOptions = angoose.config()[EXTENSION] ;
    angoose.getLogger('angoose-authorization').setLevel((extensionOptions && extensionOptions.logging) || 'INFO');
    return angoose.getLogger('angoose-authorization')
}
function postAuth(next, allowed){
   var extensionOptions = angoose.config()[EXTENSION]  ;
   
   var ctx = angoose.getContext();
   var invocation = ctx.getInvocation();
   var user = ctx.getPrincipal();
   
   /** admin user bypass */
   var superuser =  extensionOptions && extensionOptions.superuser 
   if(user.getUserId() ===  superuser ) return next(false, true); // always allow super user admin
   var superrole = ( extensionOptions && extensionOptions.superrole ) || 'admin';
   if(user && user.getRoles().indexOf(superrole) >=0) return next(false, true);
   
   logger().trace("in auth.postAuth:", invocation.clazz, invocation.method);
   if(invocation.method == 'signin' || invocation.method=="signout") return next(false, true);

   var mod = angoose.module( invocation.clazz );
   var category = mod.config(EXTENSION +".category") || invocation.clazz;
   var group = toolbox.camelcase(getGroup(mod, invocation.method)) || invocation.method;
   
    var roles = user.getRoles() ? user.getRoles(): [];
    roles = Array.isArray(roles)? roles: [ roles ];
    if(roles.indexOf('guest') <0) roles.push('guest');
    if(roles.indexOf('authenticated') <0) roles.push('authenticated');
   
   var allowed = isAllowed( category +"."+ group, roles, function(allowed){
       logger().trace("isAllowed: ", category, group, allowed);
        next(null, allowed);    
   });
};
// redaction
function redact(next){
    logger().trace("in auth.preRedact"); 
    next();
};
function isAllowed(action, roles, callback){
    logger().trace("Checking ", roles, " for action", action);
    getMatrix(function(perms){
        for(var i=0;i<roles.length;i++){
            var permissions =  perms &&  perms[ roles[i] ];
            if(permissions && permissions.get( action )  === true ) return callback(true);
        };
        callback(false); 
    });
}


function getMatrix(callback){
    if(cached){
        return callback(cached);
    }
    angoose(AUTHMODEL).find(function(err, perms){
        if(err) logger().error("Failed to load permission roles", err);
        cached = {};
        for(var i=0; perms && i<perms.length; i++){
            var perm = perms[i];
            cached[perm.role] = perm;
        }
        callback(cached);
    });    
}
function schemaInterceptor(next,  schema){  // shouldn't the err argument be here? 
    //console.log("in post prepareSchema",schema);
    if(schema && (schema.methods || schema.statics) ){
        var methodNames = (schema.methods && Object.keys(schema.methods)) || [];
        methodNames.concat( (schema.statics && Object.keys(schema.statics)) || []);
        for(var i=0;methodNames && i<methodNames.length;i++){
           var mName = methodNames[i];  
           var path = schema.moduleName +"." + mName;
           var opts = {path: path, options:{type:'Boolean'} };
           authItems[path] = opts;  
        };
    };
    next(null, schema);  // we shouldn't need to provide the arguments here, bug in hooks module?
};

function getGroup(module, methodName){
     var configPath = EXTENSION+"."+methodName+".group";
     var grp =  module.config(configPath) || ""
     if(!grp && isModel(module)){
         //populate,find,findOne,findById,findByIdAndRemove,findByIdAndUpdate,findOneAndRemove,findOneAndUpdate,update,remove,count,geoNear,geoSearch,aggregate
         // mongoose groups:  View, Modify, Create, Remove
         if('populate,find,findOne,findById,geoNear,geoSearch,aggregate,count,'.indexOf(methodName)>=0) return 'View';
         if('update,save'.indexOf(methodName  )>=0) return 'Modify';
         if('remove'.indexOf(methodName )>=0) return 'Delete';
         if('create'.indexOf(methodName  )>=0) return 'Create';
         if('findByIdAndRemove,findByIdAndUpdate,findOneAndRemove,findOneAndUpdate'.indexOf(methodName) >=0) return "find-and-modify"
     }
     return grp
}
function getLabel(module, methodName){
    var configPath = EXTENSION+"."+methodName+".label";
    return module.config(configPath) || toolbox.camelcase(methodName, true)
}
function getCategory(module){
    var configPath = EXTENSION+".category";
    return module.config(configPath) || module.config('name');
}
function isModel(module){
    return module.config('baseClass') == 'Model';
}
function serializeModulesInterceptor(next,  schemas){
    // generating PermissionModel schema used on UI
    logger().debug("in post serializeModules " ); 
    var clientSchema = new angoose.Schema();
    var authSchema = getModelSchema(); 
    // get list of all published methods
    Object.keys(schemas).forEach(function(moduleName){
        var schema = schemas[moduleName];
        if(!schema || moduleName == 'SampleUser') return;
        var methodNames =   Object.keys(schema.methods).concat(Object.keys(schema.statics));
        
        var module = angoose.module(moduleName);
        var category = getCategory(module);
        for(var i=0;methodNames && i<methodNames.length;i++){
           var mName = methodNames[i];
           if(mName == 'config' || mName == 'getSchema') continue;
           var fn = schema.methods && schema.methods[mName];
           fn = fn || (schema.statics && schema.statics[mName]);
           if(angoose.Schema.typeOf(fn) != 'remote') continue; 
           
           var group = getGroup(module, mName);
           if(!group){
               var path = category +"." + mName;
               var field = {};
               field[path] = {type:Boolean, label: getLabel(module,mName)};
               authSchema.add(field);    
           }
           else if(!authSchema.path(group)){
               // add schema path for the permission group
               var path = category +"." +  toolbox.camelcase(group);
               var field = {};
               field[path] = {type:Boolean, label: toolbox.camelcase(group, true)};
               authSchema.add(field);   
           }
        };
    });
    var mongooseModel =  angoose.getMongoose().modelNames().indexOf(AUTHMODEL)>=0? angoose.getMongoose().model(AUTHMODEL):angoose.getMongoose().model(AUTHMODEL, authSchema) ;
    var permModule = angoose.module(AUTHMODEL, mongooseModel); 
    var checker = false;
    clientSchema.prepareSchema(AUTHMODEL, permModule, function(err, pSchema){
        // this callback is guaranteed done synchorounsly
        schemas[AUTHMODEL] = pSchema;
        checker = true;  
    });
    if(!checker) throw("prepareSchema extension did not return immediately"); 
    next(false, schemas);
};

function postInvoke(next, data){
    // this is bizzare, if main method fails, this will be called with arguments meant for pre()
    var invocation = angoose.getContext().getInvocation(); 
    if( ['signin', 'signout'].indexOf(invocation.method ) <0 ) return next(false, data);
    logger().debug("Intercepting login methods", invocation.method, data);
    if(!data || !data.userId  )
        return next(false, data);
    if(invocation.method == 'signin'){
        angoose.getContext().getRequest().session.$authenticatedUser =   {userId: data.userId, roles: data.roles } ;
        logger().debug("User authenticated", angoose.getContext().getRequest().session.$authenticatedUser );
    }
    if(invocation.method == 'signout'){
        angoose.getContext().getRequest().session.$authenticatedUser =   null;
        logger().debug("User logged out", data.userId);
    }
    next(false, data);
};

function moduleSetup(next){
    next();    
} 

function session(){
     return angoose.getContext().getRequest().session || {};
};

function getModelSchema(){
    var schema =  new angoose.getMongoose().Schema({
         role: {type:String, label:'Role', required:true, tags:['default-list'], unique:true }
    }, {collection: COLLECTION_NAME});
    
    schema.pre('save', function(next){
       cached =  null; // invalidate the cache
       next(); 
    });
    
    return schema;
}

