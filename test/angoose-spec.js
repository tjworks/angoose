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
    httpPort: 9988
};
var app = startApp();    
var AngooseServer = require(ROOT+ "/lib/angoose");
AngooseServer.init(app, configs);
var userdata = { 
    firstname:'Gaelyn', 
    lastname:'Hurd',
    status:'active',
    email:'gaelyn@hurd.com'
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
       request('http://localhost:9988' +configs.urlPrefix+'/angoose-client.js', function(err, response, body){
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
    it("Sample User Find", function(done){
        var SSU = require(ROOT+ "/models/SampleUser");
        
       
        eval(clientSource);
        var SampleUser = AngooseClient.model("SampleUser");
        
        expect(SampleUser.save).not.toBeTruthy()
        expect(SampleUser.find).toBeTruthy()
        expect(SampleUser.findOne).toBeTruthy()
        
        var suser = new SampleUser( userdata);
        expect(suser.remove).toBeTruthy()
        suser.save().done(function(res){
                console.log("Expecting save OK: ", res);
                
                SSU.findById( suser._id ).exec(function(err, obj){
                    console.log("server object find",err,  obj);
                    
                    SampleUser.findById( suser._id ).done(function(su){
                        console.log("Expecting findById OK: ", su);
                        done();
                    }, function(err){
                        console.log("Failed to find ", err);
                        expect(err).toBe("OK");
                        done();
                    })
                });
                
                // now trying to find one
                //SampleUser.find()
        })
    });
    it("Sample User Save", function(done){
        eval(clientSource);
        var SampleUser = AngooseClient.model("SampleUser");
        
        expect(SampleUser.save).not.toBeTruthy()
        expect(SampleUser.find).toBeTruthy()
        expect(SampleUser.findOne).toBeTruthy()
        
        var suser = new SampleUser( userdata);
        expect(suser.remove).toBeTruthy()
        suser.email = 'john@'
        suser.save(function(err, res){  // can either user callback for promise
            console.log("Expecting error: ", err);
            expect(err).toBeTruthy();
            expect(err.indexOf('email')).toBeGreaterThan(0);
            expect(err.indexOf('invalid')).toBeGreaterThan(0);
            suser = new SampleUser( userdata);
            suser.save().done(function(res){
                console.log("Expecting save OK: ", res);
                
                SampleUser.find({email:suser.email}).done(function(su){
                    console.log("Expecting find OK: ", su);
                    expect(su && su.length).toBe(1)
                    su && su.length&& su[0].remove().done(function(res){
                        console.log("Expecting remove() to be OK:", res);
                        done();
                    }, function(er){
                        console.log("Failed to remove", er);
                        expect(err).toBe("OK");                        
                    });    
                }, function(err){
                    console.log("Failed to find ", err);
                    expect(err).toBe("OK");
                    done();
                })
                // now trying to find one
                //SampleUser.find()
                
                
            }, function(er){
                console.log("Unexpected error: ", er);
            })
        })
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

exports = {
    clientcode: clientSource
}
