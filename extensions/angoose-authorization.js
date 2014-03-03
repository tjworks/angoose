var angoose = require("../lib/angoose");
var toolbox = require("../lib/util/toolbox");

var EXTENSION = 'angoose-authorization';
var MODEL_NAME  = 'PermissionModel';
var COLLECTION_NAME  = 'angoose_perms';

var cached = null;
var authExt = {
    name: EXTENSION,
    preAuthorize: preAuth,
    postAuthorize: postAuth,
    preRedact: redact,
    postInvoke: postInvoke,
    beforeCreateBundle: beforeCreateBundle
};

module.exports = angoose.extension('AngooseAuthorization',  authExt);

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
function postAuth(next, invocation){
   var extensionOptions = angoose.config()[EXTENSION]  ;
   
   var ctx = angoose.getContext();
   var user = ctx.getPrincipal();
   
   invocation.allowed = true;
   
   /** admin user bypass */
   var superuser =  extensionOptions && extensionOptions.superuser 
   if(user.getUserId() ===  superuser ) return next(); // always allow super user admin
   var superrole = ( extensionOptions && extensionOptions.superrole ) || 'admin';
   if(user && user.getRoles().indexOf(superrole) >=0) return next();
   
   logger().trace("in auth.postAuth:", invocation.clazz, invocation.method);
   if(invocation.method == 'signin' || invocation.method=="signout") return next();

   var mod = angoose.module( invocation.clazz );
   var category = mod.config(EXTENSION +".category") || invocation.clazz;
   var group = toolbox.camelcase(getGroup(mod, invocation.method)) || invocation.method;
   
    var roles = user.getRoles() ? user.getRoles(): [];
    roles = Array.isArray(roles)? roles: [ roles ];
    if(roles.indexOf('guest') <0) roles.push('guest');
    if(roles.indexOf('authenticated') <0) roles.push('authenticated');
   
   var allowed = isAllowed( category +"."+ group, roles, function(allowed){
        logger().trace("isAllowed: ", category, group, allowed);
        invocation.allowed = allowed;
        next();    
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
    angoose(MODEL_NAME).find(function(err, perms){
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
function beforeCreateBundle(  client){
    // generating PermissionModel schema used on UI
    logger().debug("in beforeCreateBundle"); 
    MODEL_NAME = angoose.config('angoose-authorization.model-name') || MODEL_NAME;
    COLLECTION_NAME = angoose.config('angoose-authorization.collection-name') || COLLECTION_NAME;
    
    var schemas = client.schemas;
    var authSchema = getModelSchema(); 
    // get list of all published methods
    Object.keys(schemas).forEach(function(moduleName){
        var schema = schemas[moduleName];
        if(!schema || moduleName == 'SampleUser') return;
        var methodNames =   Object.keys(schema.methods).concat(Object.keys(schema.statics));
        var mod = angoose.module(moduleName);
        if(mod.config && mod.config("visibility") === false ) return;
        var category = getCategory(mod);
        for(var i=0;methodNames && i<methodNames.length;i++){
           var mName = methodNames[i];
           if(mName == 'config' || mName == 'getSchema') continue;
           var fn = schema.methods && schema.methods[mName];
           fn = fn || (schema.statics && schema.statics[mName]);
           if(toolbox.methodType(fn) != 'remote') continue; 
           
           var group = getGroup(mod, mName);
           if(!group){
               var path = category +"." + mName;
               var field = {};
               field[path] = {type:Boolean, label: getLabel(mod,mName)};
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
    var mongooseModel =  angoose.getMongoose().modelNames().indexOf(MODEL_NAME)>=0? angoose.getMongoose().model(MODEL_NAME):angoose.getMongoose().model(MODEL_NAME, authSchema) ;
    var permModule = angoose.module(MODEL_NAME, mongooseModel); 
    new angoose.Bundle().exportModule(client, MODEL_NAME); // toolbox.exportModuleMethods(MODEL_NAME, permModule);
    logger().debug("Added mongoose model", MODEL_NAME);
    
    setupInitialRoles();
};

function postInvoke(next, invocation){
    // this is bizzare, if main method fails, this will be called with arguments meant for pre()
    //var invocation = angoose.getContext().getInvocation(); 
    if( ['signin', 'signout'].indexOf(invocation.method ) <0 ) return next();;
    
    if(invocation.method == 'signout'){
        if(angoose.getContext().getRequest().session)
            angoose.getContext().getRequest().session.$authenticatedUser =   null;
        logger().debug("User logged out");
    }
    var data = invocation.result;
    logger().debug("Intercepting login methods", invocation.method, data);
    if(!data || !data.userId  )
        return next();;
    if(invocation.method == 'signin'){
        angoose.getContext().getRequest().session.$authenticatedUser =   {userId: data.userId, roles: data.roles } ;
        logger().debug("User authenticated", angoose.getContext().getRequest().session.$authenticatedUser );
    }
    next();    
};

function moduleSetup(next){
    next();    
} 

function session(){
     return angoose.getContext().getRequest().session || {};
};

function getModelSchema(){
    var schema =  new angoose.getMongoose().Schema({
         role: {type:String, label:'Role', required:true, tags:['default-list'], unique:true },
         desc: {type:String, label:'Description',tags:['default-list']}
    }, {collection: COLLECTION_NAME});
    
    schema.pre('save', function(next){
       cached =  null; // invalidate the cache
       next(); 
    });
    
    return schema;
}


function setupInitialRoles(){
    var model=  angoose.module(MODEL_NAME);
    model.findOne({role:'admin'}, function(err, role){
        if(role) return;
        var u = new model({
            role:'admin', 
            desc:"System default role with all permissions"
        });
        u.save(function(err){
            logger().debug("Added default role: admin");
        });
    });
    model.findOne({role:'authenticated'}, function(err, role){
        if(role) return;
        var u = new model({
            role:'authenticated', 
            desc:"System default role for authenticated user"
        });
        u.save(function(err){
            logger().debug("Added default role: authenticated");
        });
    });
    
     model.findOne({role:'guest'}, function(err, role){
        if(role) return;
        var u = new model({
            role:'guest', 
            desc:"System default role for guest user"
        });
        u.save(function(err){
            logger().debug("Added default role: guest");
        });
    });
};
