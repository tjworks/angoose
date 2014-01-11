
module.exports = function(grunt) {
    // Project configuration.
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    watch: {
        files: "lib/**/*.js"
    },
    jasmine_node: {
            specNameMatcher: "spec", // load only specs containing specNameMatcher
            projectRoot: "./test",
            requirejs: false,
            forceExit: true,
            jUnit: {
              report: true,
              savePath : "./build/reports/",
              useDotNotation: true,
              consolidate: true
            }
    },
     shell:{
         'test-server': {
             command: "./kick"
         }
         
     }
  });

    // Load the plugin that provides the "uglify" task.
    grunt.loadNpmTasks('grunt-jasmine-node');
    grunt.loadNpmTasks('grunt-shell');
    grunt.registerTask('combine',['concat', 'import-modules'] );
  
    // Default task(s).
    grunt.registerTask('default', []);
  
    grunt.registerTask("test", "Serverside unit tests", function(argPattern){
        // change NODE_ENV to unittest 
        grunt.config.set("jasmine_node.projectRoot", "./test");
        var pattern = grunt.option("file") || argPattern || "";
        grunt.log.writeln("running   unit test:", (pattern||""));
        pattern && grunt.config.set("jasmine_node.match" ,  ".*" + pattern + ".*");
        grunt.task.run('jasmine_node');
    });
    
    grunt.registerTask("server", "Run test server on port 9988", function(argPattern){
        // change NODE_ENV to unittest 
        grunt.log.writeln("Starting test server");
        require("./test/server").startServer();
    });
  
};


process.on('uncaughtException',function(e) {
    var sys = require("sys");
    sys.log(" Unhandled Error -----> : " + e.stack);
});
