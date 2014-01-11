## What is it?
The motive for Angoose project is to do away with the dual model declarations(server and client side) if we are building a rich model based SPA application 
using modern framework such as Angular and node.js.  

Angoose depends on following frameworks and assumes you have basic familarities with these frameworks

* angular
* mongoose
* express

## Get Started


#### 1. npm install angoose

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
       modelDir: './models',
       mongo_opts: 'localhost:27017/test'
    });

Here we assume your Mongoose model files are defined under `models` sub directory relative to the current dir where you start your app. 

#### 3 Restart app. 

Restart the server side app. We will use the `SampleUser` model come with Angoose for demo purpose so no need to create a Mongoose model just yet. 

#### 4. In your HTML file where angular library is included, add after angular script tag:

     <script src="/angoose/angoose-client.js"></script>
     
Note the `/angoose/angoose-client.js` route will be handled by Angoose in the backend.  

#### 5. In your main angular app, add `angoose-client` to your app module dependencies. For example:

    var myapp = angular.module('myapp', ['ngRoute', 'ui.bootstrap', 'angoose.client']);

#### 6. You are ready to go!

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
		/** here we are using Q's promise, an alternate to callback function */
		newUser.save().done(function(result){
			/** result is undefined since model.save() does not return value */
			console.log(newUser._id);  // print out: _id value
			newUser.remove(); // remove this user from database
		}, function(err){
			/** if something went wrong */
		});
	});
	

Contents of the SampleModel.js for quick reference, you can find it under angoose's models/ directory: 

	var mongoose = require('mongoose');
	var SampleSchema = mongoose.Schema({
	        email:  {type: String, required: true, match: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,4}$/i, index:true},
	        firstname: {type: String, required:true },
	        lastname: {type: String, required:true },
	        status: {type: String, enum: ['inactive', 'active', 'disabled', 'archived'], required:true, def:'inactive' },
	        password: { type:String, required:true },
	    },
	    { collection:'SampleUsers',  discriminatorKey: 'type' }
	);
	
	SampleSchema.methods.setPassword= function(newPassword, $callback){
	    // instance method, reset user's password
	    var cryptor = require("crypto"); // require node module crypto
	    this.password = cryptor.encrypt("salt", newPassword);
	    this.save($callback);
	}
	SampleSchema.statics.getSample = function(){
	    // static method
	    return this.findOne({firstname:'Gaelyn'});  // note .exec() will be called by Angoose before return value to client side.
	}
	// notice the exports return, it is a Mongoose Model type
	module.exports = mongoose.model('SampleUser', SampleSchema);   
	
## References

There're additional documentation under `angoose/docs` folder. This library is in its early alpha stage however we're using it in our product. Expect it to be actively maintained. Here 
are some random things you need to know if you want to try it out

#### Supported Mongoose Model Methods 

Note not all Mongoose model functionalities are supported yet. Following are a list of methods you can use today:

** Instance methods **

- save
- remove
- populate (this is Angoose addition)

** Static methods **

- populate
- find
- findOne
- findXXX (all other find methods)
- update
- remove
- $get (Angoose addition)
- $query (Angoose addition)

All of these methods will return a Q promise, or you may pass in a callback as last argument. Whichever way you prefer. 

#### Custom Methods

Any custom method you defined in the Mongoose schema will be made available to the client. 

You may be able to define some simple helper methods on the model that do not have external dependencies as `portable` method. A portable method can be 
executed entirely on client side without server interaction. Please see [Schema](http://tjworks.github.io/angoose/docs/Schema.html) for more details regarding to the
method types using method name annotation.

#### Angoose Context

Within all of your custom methods, you have access to an object `Angoose Context` which would give you the reference to the current request, response, session
and authenticated user object(TBD). Please see [Context](http://tjworks.github.io/angoose/docs/Context.html) for additional info.


#### Service Classes

Not all logic is centered around persistence models. You may need to define service functionalities and expose to the client. Angoose allows you to create a Service class 
to define business logic that either does not deal with data models or deals with multiple data models.  See [Service](http://tjworks.github.io/angoose/docs/Service.html) for
additional information




