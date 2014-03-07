var ROOT = process.cwd();
var clientfile =  ROOT+'/build/generated-client.js';
var _ = require("underscore");

var configs = {
    modelDir: ROOT+'/models',
    'client-file': clientfile,
    'urlPrefix': '/angoose',
    httpPort: 9988,
    logging:'DEBUG',
    mongo_opts:'localhost:27017/test', 
    extensions:['angoose-ui', 'angoose-users']
};  


function initAngoose(app, opts, force){
    var angoose = require(ROOT+"/lib/angoose"); 
    configs = _.extend(configs, (opts|| {}))
    angoose.init(app, configs, force);
    //angoose.client(true);
    return angoose;
}

angoose = initAngoose(null);

