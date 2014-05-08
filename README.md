## 1.What is it?
================

The original motive for Angoose project is to do away with the dual model declarations(server and client side) if we are building a rich model based SPA application 
using modern Javascript framework such as Angular and node.js.  With both front end and backend using Javascript, Angoose allows the server side models and services
to be used in the client side as if they reside in the client side.

Angoose depends on following frameworks and assumes you have basic familarities with them:

* mongoose
* express 
* angular (optional, for non-angular app, jQuery is required)


#### Angoose Demo 

If you would like to see Angoose in action, there is a demo site you can checkout. Go to:

  https://github.com/tjworks/angoose-demo
  
All you need to do is clone, npm install, and run. 


## 2. Get Started
=================

Following are the steps to integrate angoose with your existing project

#### 1. npm install angoose

Or add `angoose` to your dependencies in your package.json file.

#### 2. configure angoose
Assuming you already have an express server/app file, you just need to add following line to the app.js, after the app.configure() block:

	/** Typical express configuration */
	app.configure(function() {
		app.use(express.favicon());
		app.use(express.bodyParser());
		...
	});

	/** Angoose bootstraping */
    require("angoose").init(app, {
       'module-dirs':'/models',
       'mongo-opts': 'localhost:27017/test',
    });

Here we assume your Mongoose model files are defined under `models` sub directory relative to the current dir where you start your app. 

Restart node.js 


#### 3. In your HTML file where angular library is included, add after angular script tag:

     <script src="/angoose/angoose-client.js"></script>
     
**NOTE**
- The `/angoose/angoose-client.js` route will be handled by Angoose in the backend.
- This file contains dynamic content based on your backend models. If you don't see updates in your client after changing backend, make sure no cache is in play. 

  

#### 4. In your main angular app, add `angoose-client` to your app module dependencies. For example:

    var myapp = angular.module('myapp', ['ngRoute',   'angoose.client']);

#### 5. You are ready to go!

All the models defined in the `./models` folder will be auto-loaded and readily available for injection into your controller/service/directives etc, 
just delcare them in the function argument list(We're using `SampleUser` as example here): 

	angular.module('myapp').controller('UserCtrl', function($scope, SampleUser) {
	
		/** There are two special methods provided by Angoose on Mongoose models that resemble Angular's 
		 *  $resource usage. `$get` will allow you to query for one model instance and `$query` for multiple
		 *  values.  Calling `ModelClass.$get` will return immediately with a reference.
		 * No callback is required, you can use `{{ sampleUser.firstname }}` in the template and 
		 * view will be automatically updated once the data arrives from server side.
		 */ 
		$scope.sampleUser = SampleUser.$get({'email':'xxx@yyy.com'} );  // get one user   
		$scope.disabledUsers = SampleUser.$query({'status': 'disabled'});   // get multiple users
		
		// create new instance and validations		
		var newUser = new SampleUser({
			firstname:'xxx',
			lastname:'yyy',
			email:'xxx@asd',
			status:'active'
		});
		/** Call Mongoose model's save method. 
		  * most of the methods will be async, even it's synchronous on the server side. 
		  We're sending this call over the wire, after all */ 
		newUser.save(function(err, result){
			console.log(err);  // print out: 'email' is invalid
		});

		newUser.email = 'test@google.com';
		newUser.save(function(err, result){
			/** result is undefined since model.save() does not return value */
			console.log(newUser._id);  // print out: _id value
			newUser.remove(); // remove this user from database
		}, function(err){
			/** if something went wrong */
		});
	});
	
#### 6. If you are not using Angular

If you don't use angular, then you just need to include jQuery before the angoose-client.js. Then instead of step 4 & 5, you could simply do:

 		var SampleUser = angoose('SampleUser'); // lookup SampleUser module, this is same as angoose.module('SampleUser')
 		// get one user
		var sampleUser = SampleUser.findOne({'email':'xxx@yyy.com'}, function(err, user ){  
			sampleUser.firstname='Gaelyn';
			sampleUser.save(function(err){
				if(!err)  console.log("Success!");
				else alert("Something went wrong: " + err);
			});
		});    
  
## 3. How It Works?
===================

The core of the Angoose is its Remote Method Invocation, or RMI, that bridges the gap between server side and front end. With this technique, the server side modules, such as
Mongoose models and custom defined service modules will be transparently made available to the client side. No need for REST api or route setup. Just call the modules as if they
reside in the browser! See diagram below for a depiction of the RMI process. 

![Angoose Remote Method Invocation](https://www.lucidchart.com/publicSegments/view/52dbe203-1508-4b43-b6cb-5c020a00d361/image.png)
	 

## 4. Angoose Module
==========================

Wah, you say, so I can use every NPM module out there in my front end? 

Unfortunately, no. Server side modules will not be automatically become avaialbe to the client side. And really you only want to make those modules with database/filesystem or other 
external IO operations available to the front end. For instance, Mongoose models or other database oriented service modules are good usa case of Angoose modules.

Only modules registered with Angoose will be exported to client side(hence the term `angoose module`). To register a module:

- For Mongoose models, just make sure you set your `module.exports` to the return value of `mongoose.model()` call. 
- For other modules, call `angoose.module(name, func_or_object)` to register your service module. (angoose.service() is still supported and does same thing)

And for either case, make sure Angoose knwo where to find your model files by using the `modelDir` configuration.

There are a couple of exmaples under `angoose/models` directory for reference. 

#### About Mongoose Models

Note not all Mongoose model functionalities are exported yet. Following are a list of methods you can invoke on a Mongoose model from client side: 

**Instance methods**

- save
- remove 

**Static methods**

- populate
- find
- findOne
- findXXX (all other find methods)
- update
- remove
- count
- geoNear
- geoSearch


**NOTE** 

You must supply a callback for most of these Mongoose model methods. Mongoose `query` is NOT supported in the client side yet. On the server side, Mongoose allows you to call
these methods without a callback function and it will return a `Qeury` instance to facilitate chaining. This may be changed in the future.  

In addition, there are two sugar methods designed for Angular. They similute the `$resource.get()` and `$resource.query()` in angular, in the way the method returns immediately with
a reference to the empty object/list. This way you don't need to use callback.  The empty object/list will be automatically populated(and view updated accordingly) once server side returns. Both of methods takes parameters similar
to the Mongoose find() method.
  
- Model.$get() 	Return a reference to one object
- Model.$query()  Return a reference to an array of objects

 

**Custom Methods on Mongoose Models**

Any methods you defined in the Mongoose schema(whether static or instance) will be treated as remotable method and automatically exported to client.  


## 5. Writting a Remotable Method
=================================

A few things to note when write a remotable method(methods invokable from client side).

#### Handle Return Values and Errors in your Model or Service classes. 
When you define custom methods on your Model or Service class, you must adhere to following conventions:


**Method has no async call**

If your method has no asynchronous call and returns the data directly at the end of the execution, no special handling is required. Just use normal `return xxx`.

Or if there is no data to return, just skip the `return` statement.

If there is error during the method, you may return an error(avoid throw an error if possible):

		if(!require("fs").existsSync(filename))
			return new Error( "File "+ filename+" does not exit");

**Method has async call** 

When you have async call in your method, you can no longer directly return the results or report an error if it occurred from callback handler.  In this case, you must declare
a callback function as your last function argument:
 
	/** MyService is an Angoose Service */
	var MyService = function(){}
	MyService.geocoding = function(address, $callback){ 
		/** note 2nd argument $callback. 
		var googleApi = require("google-geo-api");
		googleApi.lookup( address, function( err, matchedAddresses){
			if(err)  $callback(err);
			else $callback(false, matchedAddresses[0]); /** $callback takes two arguments: err, result */
		});
	} 
	module.exports = angoose.module("MyService", MyService);


#### Specifying Method Type

**This is optional feature.**

You may use method annotation to indicate whether method should be exposed to the client side or only executed on the local/server side. Angoose recognizes following
method types:

- remote
- local
- portable

Method annotation is optional and all the methods you defined on your Model or Service (whether static or instance) are considered `remote` method, as long as you properly handled errors
and return values accordingly. 
 
Angoose relies on the function name to indicate which type of method it is.   In general the function name is not required when you define the methods on Mongoose schema
or on a Service class because the method would be assigned to a property of the container object. Example for a Mongoose model shcema:
 
     new Schema({
        methods: {
            updateStatus: function(){ // notice function is annonymous
                // body
            }
        }
     })  
  
 Angoose hence uses the unused function name as a way to annotate the method for the purpose of RMI. For instance, to indicate a method
 can be exported to the remote client, you would write the function like this:
 
     {
        methods: {
            updateStatus: function remote(){ // function name is 'remote'
                // body
            }
        }
     }

The function name can be any of following:     
  
**remote**

This indicates the method should be exported to client side with a stub. Actual execution occurs on the server side. This is the default type.
 
**portable**

This indicates the method should be "ported" to  client side. The actual execution will happen in client side only if
 it is invoked by client code. You can still invoke this method in the server side in which case the execution is done on the server side.
 
 An example of this usage is some helper method that only operates on the instance object and has no other dependencies. i.e., a method to concatenate the names
 to return a full name:
 
     {
       methods: {
           getFullname: function portable{
               return (this.firstname || "") + " " + (this.lastname || "");
           }
       }
     } 
 
 
 
**local**

This indicates the method should NOT be exported. It can only be invoked on the server side, locally. 
    

#### Angoose Context
 
Angoose supports an execution context feature that allows you to access some contextual state from any part of the code,
as long as the code execution was originated by Angoose RMI handler. This is made possible by  node domain.  

For each Angoose RMI invocation request, an unique Context object is created when Angoose starts handling. The context contains the request
and response objects, as well as session and authenticated user info(TBD). The context can then be accessed by all the subsequent code paths, including in async callback functions.

To obtain the context, you may simple call:

     angoose.getContext()
 
Some of the common usage with the getContext() method:

    angoose.getContext().getRequest():  returns the Express request object
    angoose.getContext().getRequest().session Get Express request session.

 
