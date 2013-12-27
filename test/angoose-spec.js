var ROOT = process.cwd();
var path= require("path")
var http = require("http");
var fs = require("fs");
var express = require("express");
var request = require('request');
var clientfile =  './build/angooseclient.js';
console.log("Deleting ", clientfile);
if(fs.exists(clientfile))
    fs.unlinkSync(clientfile);
    
var app = startApp();    

var AngooseServer = require(ROOT+ "/lib/angoose"); 
AngooseServer.init(app, {
    modelDir: ROOT+'/test/models',
    clientFile: clientfile,
    urlPrefix: '/angoose'
});
var userdata = {
               meta: { firstname:'Gaelyn', lastname:'Hurd'},
               status:'active'
};
describe("Angoose Server Tests", function(){
    it("test load client file", function(done){
            eval( fs.readFileSync( clientfile, 'ascii') );
            expect(typeof(AngooseClient)).not.toBe("undefined");
            expect(AngooseClient.schemas.User).toBeTruthy();
            
            
            var User = AngooseClient.model('User');
            var user = new User (userdata);
            console.log(user, typeof(User) )
            expect(user.getFullname()).toBe('Gaelyn Hurd');
            console.log("test #1 okay")
            
            
            var SampleUser = AngooseClient.model("SampleUser");
            var suser = new SampleUser({
                email:'john@xyz.com',
                firstname:"Hurd",
                lastname:'Gaelyn',
                status:'active'
            });
            expect(suser.getFullname()).toBe("Hurd Gaelyn");
            suser.setFullname("John Babara").done(function(res){
                    console.log("setFullname call complete", res)
                    expect(suser.getFullname()).toBe("John Babara");
                    done(); 
             });
          
            done();
    });
    it("User methods", function(done){
       request('http://localhost:17029/angoose/angoose-client.js', function(err, response, body){
          eval(body);
          var User = AngooseClient.model('User');
          var user = new User (userdata);
          expect(user.getFullname()).toBe('Gaelyn Hurd');
          user.setFullname("John Babara").done(function(res){
                console.log("setFullname call complete", res)
                expect(user.getFullname()).toBe("John Babara");
                done(); 
          });
       });
    });
     
}) ;

function startApp(){
    var app = express();

    app.configure(function() {
        app.set('port', 17029);
        app.use(express.bodyParser());
        /* manage sessions */
        app.use(express.cookieParser());
        app.use(express.session({secret: '1234567890QWERTY'}));
        app.use(app.router);
        app.use(function(err, req, res, next){
            console.log("In error handling", err)
            if (err.message == 'APIAuthError') {
                res.send(401, {success:false, msg:"Authorization Error"});
            } else {
                res.send(500, 'Something broke!');
            };
        });
        
        app.use(express.methodOverride());
        app.use(express.static(path.join(__dirname, 'public')));
    });
    http.createServer(app).listen(17029, function(){
        console.log("Listening on port " , 17029);    
    });
    return app;   
}
