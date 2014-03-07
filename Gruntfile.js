
module.exports = function(grunt) {
    // Project configuration.
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    karma: {
        options: {
            basePath: './',
            frameworks: ['jasmine'],
            autoWatch: true,
            browsers: ['PhantomJS'],
            junitReporter: {
              outputFile: 'build/karma-unit.xml',
              suite: 'unit'
            }, 
            singleRun:false,
            preprocessors:{
              //'**/*.tpl':['html2js'],
              //'**/*.tpl.html':['html2js']
            },
            //runnerPort:9999,
            reporters: 'dots',
            client: {
              mocha: {
                ui: 'bdd'
              }
            }
        },
        e2e: {
            background:false,
            frameworks: ['ng-scenario'],
            autoWatch: false,
            browsers: ['Chrome'],
            singleRun: true,
            proxies: {
              '/': 'http://localhost:8000/'
            },
            urlRoot: '/__karma/',
            logLevel: 'trace',
            junitReporter: {
              outputFile: 'build/karma/unit.xml',
              suite: 'e2e'
            }
        },
        unit: {
        }
    },
    watch: {
        testall:{
            files: ["lib/**/*.js", "test/**/*.js"],
            tasks:['test'],
            options: { debounceDelay: 250 }    
        }
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
    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.loadNpmTasks('grunt-karma');

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
    
    grunt.registerTask("ctest", "Client side unit test", function(argPattern){
      var pattern = grunt.option("file") || argPattern || "";
      grunt.log.writeln("running angular unit test:", (pattern||""));
      grunt.config.set("karma.options.files", collectKarmaFiles(pattern));
      
      // start angoose, this will cause angoose to generate the client file
      require("./test/lib/angular-test-server");
      
      grunt.task.run("karma:unit");
  });
    
    grunt.registerTask("server", "Run test server on port 9988", function(argPattern){
        // change NODE_ENV to unittest 
        grunt.log.writeln("Starting test server");
        require("./test/server").startServer();
    });
  
    grunt.registerTask('autotest', 'watch and test', function(argPattern) {

        var watched= ["lib/**/*.js", "test/**/*.js", "models/**/*.js", "extensions/**/*.js"];
       // set the correct list of file to watch according to the argument passed
        grunt.config('watch.autotest.files', watched);
        grunt.config('watch.autotest.tasks',  (argPattern? 'test:'+ argPattern: 'test'));
        grunt.task.run(argPattern? 'test:'+ argPattern: 'test');
        grunt.task.run('watch:autotest');
        
    })
};

process.on('uncaughtException',function(e) {
    console.log(" Unhandled Error in Grunt -----> : ", e,   e.stack);
});


function collectKarmaFiles(grepPattern){
        // collect the karma test files
    var root = process.cwd();
        
        var files = [   "./test/lib/angular/angular.js", 
                        "./test/lib/angular/angular-resource.js", 
                        "./test/lib/angular/angular-sanitize.js", 
                        "./test/lib/angular/angular-route.js",
                        "./test/lib/angular/angular-mocks.js",
                        "./build/generated-client.js"
                    ];
        // "/lib/angular-file-upload.js", 
        //"/lib/angular/ui/angular-ui.js", 
        //"/lib/bootstrap/ui-bootstrap-tpls-0.6.0.js", 
        //"/lib/select2/select2.js", 
        //"/lib/select2/select2-angular.js", 
        //"/lib/bootstrap/bootstrap-datepicker-inline.js", 
        //"/lib/bootstrap/bootstrap-timepicker-inline.js", 
    
      if(grepPattern)
        files.push( "./test/ui/**/*"+ grepPattern+"*.js");
      else
        files.push("./test/ui/**/*.js");
      console.log("Karma files", files);
      return files;    
}