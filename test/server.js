var ROOT = process.cwd();
var path= require("path")
var http = require("http");
var fs = require("fs");
var _ =require("underscore");
var express = require("express");
var logging = require("log4js");
var logger = logging.getLogger('angoose');
logger.setLevel(logging.levels.DEBUG);
 
var options = {
    modelDir: ROOT+'/models',
    urlPrefix: '/angoose',
    httpPort: 9988,
    mongo_opts:'localhost:27017/test'
};

process.on('uncaughtException',function(e) {
    var sys = require("sys"); 
    sys.log(" Unhandled Error caught in server.js -----> : " + e.stack);
});


function createApp(opts){
    opts = opts || {};
    options = _.extend(options, opts)
    
    console.log("Create express app")
    var app = express();
    app.configure(function() {
        app.set('port', options.httpPort);
        app.use(express.bodyParser());
        app.use(express.cookieParser());
        app.use(express.session({secret: '1234567890QWERTY'}));
        app.use(app.router);
        app.use(function(err, req, res, next){
            console.log("In default error handling", err)
            res.send(500, 'Unhandled error: '+ err);
        });
        app.use(express.methodOverride());
        app.use(express.static(path.join(__dirname, '/../public')));
    });
    
    require(ROOT+ "/lib/angoose").init(app, options);
    
    return app;   
}

function startServer(app, opts){
    if(!app || !app.use){
        // only 1 argument, and it is an option object 
        app = createApp(app);
    }
    else
        options = _.extend(options, (opts||{}))
    console.log("starting http server on port ", options.httpPort)
    http.createServer(app).listen( options.httpPort);
        
}
module.exports = {
    createApp: createApp,
    startServer: startServer
}

startServer();

//// 
