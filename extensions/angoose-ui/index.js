var path = require("path"), fs= require("fs");
var ui = {
    afterCreateBundle: append
};

var angoose = require("../../lib/angoose");
angoose.extension("AngooseUI", ui);


// append angoose-ui sources
function append(client){
    angoose.getLogger('angoose.ui').debug("Adding angoose-ui sources");
//    client.source += " \n;console.log('####################----------- angoose-ui -----------##############');\n";
    var output="";
    output += readFile(path.resolve(__dirname, 'core.js'));
    output += readFile(path.resolve(__dirname, 'service.js'));
    output += concatFilesInDirectory('directives');
    output += concatFilesInDirectory('controllers');
    client.source+="\n\n" + output;
} 

function concatFilesInDirectory( dir){
    var output = '';
    var absDir = path.resolve(__dirname, dir);
    var files = fs.readdirSync( absDir );
    files.forEach(function(filename){
        output+= readFile( path.resolve(absDir, filename), dir+"/"+filename);
    });
    return output;
}
function readFile(filename, relativeName){
        var output="/******* angoose-ui filename: "+ (relativeName || filename) +"   *******/\n"; 
        output+=fs.readFileSync(filename, 'ascii');
        output+="\n\n";
        return output; 
}
