/** 
    This extension is responsible to piggy back the angoose.ui angular sources to the angoose-client.js.
    This is meant to be temporary - should use grunt task to do these concatenations. 
 */

var path = require("path"), fs= require("fs");
var ui = {
    afterCreateBundle: appendUISource
};

var angoose = require("../../lib/angoose");
angoose.extension("AngooseUI", ui);

// append angoose-ui sources
//@todo: call grunt task api to concat/minify the source & templates 
function appendUISource(client){
    angoose.getLogger('angoose.ui').debug("Adding angoose-ui sources");
//    client.source += " \n;console.log('####################----------- angoose-ui -----------##############');\n";
    var output="";
    output += readFile(path.resolve(__dirname, 'angular-modules.js'));
    output += concatFilesInDirectory(['services',  'controllers', 'directives', 'filters']); //'directives',
    output +=  concatTemplates();
    client.source+="\n\n" + output;
} 


function concatTemplates(){
    var templates = {};
    var files = fs.readdirSync( path.resolve(__dirname, 'tpl') );
    files.forEach(function(filename){
         var tmp = readFile( path.resolve(__dirname, 'tpl', filename), "tpl/"+filename);
         templates[filename] = tmp;
    });
    return  "function $angooseTemplateCache(name){  var templates= "+ JSON.stringify(templates) +";  return name? templates[name]:templates; } ";
}

function concatFilesInDirectory( dirname){
    var dirs = Array.isArray(dirname)? dirname : [dirname];
    var output = '';
    dirs.forEach(function(dir){
        var absDir = path.resolve(__dirname, dir);
        var files = fs.readdirSync( absDir );
        files.forEach(function(filename){
            console.log("Concat file", filename)
            output+= readFile( path.resolve(absDir, filename), dir+"/"+filename);
        });    
    });
    return output;
}
function readFile(filename, relativeName){
        var output="/******* angoose-ui filename: "+ (relativeName || filename) +"   *******/\n";
        if(filename.indexOf(".tpl")>0) 
            output =  "<!------------- angoose-ui filename: "+ (relativeName || filename) +" -->";
        output+=fs.readFileSync(filename, 'ascii');
        output+="\n\n";
        return output; 
}
