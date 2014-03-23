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
    angoose.getLogger('angoose').debug("Appending angoose-ui sources");
//    client.source += " \n;console.log('####################----------- angoose-ui -----------##############');\n";
    var output="";
    output += readFile(path.resolve(__dirname, 'angular-modules.js'));
    output += concatFilesInDirectory(['services',  'controllers', 'directives', 'filters']); //'directives',
    output +=  concatTemplates();
    client.source+="\n\n" + output;
} 

function concatTemplates(){
    // read default templates
    var templates = {};
    var files = fs.readdirSync( path.resolve(__dirname, 'tpl') );
    files.forEach(function(filename){
         var tmp = readFile( path.resolve(__dirname, 'tpl', filename), "tpl/"+filename);
         templates[filename] = tmp;
    });
    // read user defined templates
    var userDir=angoose.config("angoose-ui-template-dir")
    if(userDir){
        try{
            var userfiles = fs.readdirSync( path.resolve(process.cwd(), userDir));
            userfiles.forEach(function(filename){
                var tmp = readFile( path.resolve(process.cwd(), userDir,filename), userDir+"/"+filename);
                templates[filename] = tmp;
            });
        }
        catch(ex){
            angoose.getLogger('angoose').error(ex);
        }
    }
    angoose.getLogger('angoose').debug("preprocessing templates: ", Object.keys(templates).length);
    return  $angooseTemplateCache.toString().replace("{/**TEMPLATES*/}", JSON.stringify(templates));
}

function concatFilesInDirectory( dirname){
    var dirs = Array.isArray(dirname)? dirname : [dirname];
    var output = '';
    dirs.forEach(function(dir){
        var absDir = path.resolve(__dirname, dir);
        var files = fs.readdirSync( absDir );
        files.forEach(function(filename){
            angoose.getLogger('angoose').trace("concating file", filename)
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

//@todo: properly implement it according to angular $templateCache
function $angooseTemplateCache(name, content){

    $angooseTemplateCache.templates = $angooseTemplateCache.templates || {/**TEMPLATES*/}; // this will be replaced
    if(!name) return;
    if(content){
        $angooseTemplateCache.templates[name]  = content;
    } 
    else {
        return $angooseTemplateCache.templates[name];
    }
}
