var ROOT = process.cwd();
var util = require("./test-util");

function MyService(){};
MyService.allowedOp =  function($callback){
    console.log("In MyService.allowedOp")
    $callback(false,'OK');
}
MyService.forbiddenOp = function($callback){
    console.log("In forbiddenOp");
    $callback(false, 'NotOK')
}    
MyService.signin = function(userId, role, $callback){
    $callback(false, {
        userId:userId,
        roles:role
    });
}
MyService.signout = function(userId, $callback){
    $callback(false, {userId:userId});
}



 
// this cannot be run with the rest tests    
xdescribe("Angoose-Auth Tests", function(done){
    
     var angoose = util.initAngoose(null, {
            extensions:  [ 'angoose-authorization' ,  {
                        name:'test-adder',
                        preGenerateClient: preGen 
                    }],
            'angoose-authorization': {
                superuser: 'admin'
            }
        });
        
    function preGen(next){
        require('../lib/angoose').module('MyService', MyService );
        next();
    }

    //angoose.module('MyService', MyService )
    var myService = angoose.client().module('MyService');

    setupPermission();
    it("allowedOp should be denied to guest user", function(done){
        myService.allowedOp(function(err, ret ){
           console.log("allowedOp result", err, ret)
           expect(err).toBe('Access Denied');
           done(); 
        });
    }); 
    it("forbiddenOp should be allowed by super user admin ", function(done){
        myService.signin('admin', 'xxx', function(err, user){
            myService.forbiddenOp(function(err, ret ){
               console.log("forbiddenOp result", err, ret)
               expect( ret ).toBe('NotOK');
               done(); 
            });    
        })
    }); 
    it("Forbidden operation should be allowed after login", function(done){
        myService.signin('adminuser', 'admin', function(err, user){
            myService.forbiddenOp(function(err, ret ){
               console.log("forbiddenOp result", err, ret)
               expect( ret ).toBe('NotOK');
               done(); 
            });    
        })
    }); 
    
    it("Forbidden operation is not allowed by non-admin ", function(done){
        myService.signin('someuser', 'other', function(err, user){
            myService.forbiddenOp(function(err, ret ){
               console.log("forbiddenOp 2 result", err, ret)
               expect(err).toBe('Access Denied');
               done(); 
            });    
        })
    }); 
    it("AloowedOp operation is allowed by non-admin ", function(done){
        myService.signin('someuser', 'other', function(err, user){
            myService.allowedOp(function(err, ret ){
               console.log("forbiddenOp 2 result", err, ret)
               expect( ret ).toBe('OK');
               done(); 
            });    
        })
    });  
     
    it("AloowedOp operation is not allowed after log out ", function(done){
        myService.signin('someuser', 'other', function(err, user){
            myService.signout('someuser', function(err, user){
                myService.allowedOp(function(err, ret ){
                   console.log("after signing out ", err, ret)
                   expect(err).toBe('Access Denied');
                   done(); 
                });
            });    
        })
    });  
   it("Auth model schema should have all published methods", function(done){
        angoose.module('MyService', MyService )
       var authModel = angoose.client().module("PermissionModel");
       //console.log("###########", authModel, authModel.schema)
       if(!authModel || !authModel.schema) {
           expect("").toBeTruthy();
           return done();
       }
       
       //console.log("Permission model schema", authModel.schema.paths);
       expect( authModel.schema.paths['SampleUserGroup.View']).toBeTruthy();
       expect( authModel.schema.paths['SampleService.testExecutionContext']).toBeTruthy();
       done();
   } );
   
   
       
       
    function setupPermission(){
        it("Setup permission", function(done){
            var Model = angoose.module("PermissionModel");
            console.log("Setting up permission")
            var adminModel = new Model({
                role:'admin', 
                'AllPermissions':true,
                'MyService.forbiddenOp':true,
                'MyService.allowedOp':true,
            });
            var otherModel = new Model({
                role:'other',
                'MyService.forbiddenOp':false,
                'MyService.allowedOp':true
            });
            Model.remove({}, function(err){
                console.log("Done removing", err);
                adminModel.save(function(err, r1){
                    console.log("admin model", err, r1)
                    otherModel.save(function(err, r2){
                        console.log("Setup test permissions", r1, r2);
                        done() ;    
                    });
                });    
            });
        }) ;
    }

});
