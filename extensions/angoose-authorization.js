var angoose = require("../lib/angoose");
var EXTENSION = 'angoose-authorization';
var AUTHMODEL  = 'PermissionModel';
var COLLECTION_NAME  = 'angoose_perms';
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
    angoose.getLogger().trace("in preAuth");
    if(session().$authenticatedUser){
        angoose.getLogger().trace("Found user in session",     session().$authenticatedUser );
        //angoose.getContext().setUser( session().$authenticatedUser );
        angoose.getContext().setPrincipal( new angoose.Principal( session().$authenticatedUser.userId, session().$authenticatedUser.roles) );
    }  
    next();
};
function postAuth(next, allowed){
   //if(allowed)
   var ctx = angoose.getContext();
   var invocation = ctx.getInvocation();
   var user = ctx.getPrincipal() || {};
   var superuser = angoose.config()[EXTENSION] &&  angoose.config()[EXTENSION].superuser || 'admin';
   if(user.getUserId() ===  superuser ) return next(false, true); // always allow super user admin
   angoose.getLogger().trace("in auth.postAuth. Allowed: ", allowed, "Method:", invocation.method);
   if(invocation.method == 'signin' || invocation.method=="signout") return next(false, true);

   var allowed = isAllowed(invocation.clazz+"."+invocation.method, user.getRoles() ||'guest', function(allowed){
        next(null, allowed);    
   });
};
// redaction
function redact(next){
    angoose.getLogger().trace("in auth.preRedact"); 
    next();
};
function isAllowed(action, roles, callback){
    angoose.getLogger().trace("Checking ", roles, " for action", action);
    roles = Array.isArray(roles)? roles: [ roles ];
    
    angoose(AUTHMODEL).find({role: {$in:roles}}, function(err, perms){
        for(var i=0; perms && i<perms.length; i++){
            var permissions =  perms[i];
            console.log("permissions", permissions );
            if(permissions.get(action)  === true ) return callback(true);
        }
        callback(false);
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

function serializeModulesInterceptor(next,  schemas){
    //console.log("in post serializeModulesInterceptor",schemas);
    angoose.getLogger().warn("in post serializeModules " , Object.keys(schemas)); 
    var clientSchema = new angoose.Schema();
    var authSchema = getModelSchema(); 
    // get list of all published methods
    Object.keys(schemas).forEach(function(name){
        var schema = schemas[name];
        if(!schema) return;
        var methodNames =   Object.keys(schema.methods).concat(Object.keys(schema.statics));
        for(var i=0;methodNames && i<methodNames.length;i++){
           var mName = methodNames[i];
           var fn = schema.methods && schema.methods[mName];
           fn = fn || (schema.statics && schema.statics[mName]);
           if(angoose.Schema.typeOf(fn) != 'remote') continue; 
           var path = schema.moduleName +"." + mName;
           var field = {};
           field[path] = {type:Boolean, label:mName};
           authSchema.add(field);  
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
    var invocation = angoose.getContext().getInvocation(); 
    if( ['signin', 'signout'].indexOf(invocation.method ) <0 ) return next(false, data);
    angoose.getLogger().debug("Intercepting login methods", invocation.method, data);
    if(!data || !data.userId  )
        return next(false, data);
    if(invocation.method == 'signin'){
        angoose.getContext().getRequest().session.$authenticatedUser =   {userId: data.userId, roles: data.roles } ;
        angoose.getLogger().debug("User authenticated", angoose.getContext().getRequest().session.$authenticatedUser );
    }
    if(invocation.method == 'signout'){
        angoose.getContext().getRequest().session.$authenticatedUser =   null;
        angoose.getLogger().debug("User logged out", data.userId);
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
    return new angoose.getMongoose().Schema({
         role: {type:String, label:'Role', required:true, tags:['default-list'], unique:true }
    }, {collection: COLLECTION_NAME});
}

