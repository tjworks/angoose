var ROOT = process.cwd();
var path= require("path")
var http = require("http");
var fs = require("fs");
var express = require("express");
var request = require('request');
var clientfile =  './build/generated-client.js';
var logging = require("log4js");
var logger = logging.getLogger('angoose');
logger.setLevel(logging.levels.DEBUG);

console.log("Deleting ", clientfile);
if(fs.exists(clientfile))
    fs.unlinkSync(clientfile);
var configs = {
    modelDir: ROOT+'/models',
    clientFile: clientfile,
    urlPrefix: '/angoose-prefix',
    httpPort: 12345
};
var app = startApp();    
var AngooseServer = require(ROOT+ "/lib/angoose");
AngooseServer.init(app, configs);
var userdata = { 
    firstname:'Gaelyn', 
    lastname:'Hurd',
    status:'active'
};
var clientSource = fs.readFileSync( clientfile, 'ascii') ; 
describe("Angoose Server Tests", function(){
    it("Load client file from file", function(done){
            eval(clientSource);
            expect(typeof(AngooseClient)).not.toBe("undefined");
            expect(AngooseClient.schemas.SampleUser).toBeTruthy();
            
            var SampleUser = AngooseClient.model("SampleUser");
            var suser = new SampleUser( userdata);
            expect(suser.getFullname()).toBe("Gaelyn Hurd");
            suser.setFullname("John Babara").done(function(res){
                    console.log("setFullname call complete", res)
                    expect(suser.getFullname()).toBe("John Babara");
                    done(); 
             });
    });
    it("Load client file from http", function(done){
       request('http://localhost:17029' +configs.urlPrefix+'/angoose-client.js', function(err, response, body){
            eval(body);
            var SampleUser = AngooseClient.model("SampleUser");
            var suser = new SampleUser( userdata);
            expect(suser.getFullname()).toBe("Gaelyn Hurd");
            done();
       });
    });
    
    it("Static method", function(done){
        eval(clientSource);
        var SampleUser = AngooseClient.model("SampleUser");
        SampleUser.checkExists('newmeil@he.com').done(function(exists){
            console.log("Done done", arguments);
            expect(exists).toBe(false);
            done();
        });
    }); 
    it("Sample Service", function(done){
        eval(clientSource);
        var SampleService = AngooseClient.model("SampleService");
        SampleService.listFavoriteDestinations().done(function(places){
            console.log("Places", places);
            expect(places[0]).toBe("Paris");
            done();
        });
    });
});
function startApp(){
    var app = express();
    app.configure(function() {
        app.set('port', configs.httpPort);
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
    http.createServer(app).listen( configs.httpPort, function(){
        console.log("Listening on port " ,  configs.httpPort);    
    });
    return app;   
}
