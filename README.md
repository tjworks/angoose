## What is it?
The motive for Angoose project is to do away with the dual model declarations(server and client side) if we are building a rich model based SPA application 
using modern framework such as Angular and node.js.  

The initial effort is to bring Mongoose model to the client side and make the model APIs seamlessly available in the browser side.  

## Get Started


#### 1. npm install angoose

#### 2. configure angoose
Assuming you already have an express server/app file, you just need to add following line to the app.js, after the app.configure() block:

	...
	app.configure(function() {
		app.use(express.favicon());
		app.use(express.bodyParser());
		...
	});

    require("angoose").init(app, {
       modelDir: './models',
       mongo_opts: 'localhost:27017/test'
    });

Here we assume your Mongoose model files are defined under `models` sub directory relative to the server/app script. 

Restart your node app. 

#### 3. Define a Mongoose model if not already done

Or you can use the sample model comes with Angoose: SampleUser.


#### 4. In your client code(HTML), add following after angular script tag:

     <script src="/angoose/AngooseClient.js"></script>
     
Note the `/angoose/AngooseClient.js` route is wired by Angoose in the backend. You may change it in the conf object passed to the init function by specifying the
`urlPrefix` setting(default to `/angoose`)

#### 5. In your main angular app, add `angoose-client` to your app module dependencies. For example:

    var myapp = angular.module('myapp', ['ngRoute', 'ui.bootstrap', 'angoose-client']);

#### 6. Start using the model in the controller

All the models will be readily available for injection.

	angular.module('myapp').controller('UserCtrl', function($scope, SampleUser) {
		$scope.user = SampleUser.$get();
		console.log( user.getFullname() ); // print out "Gaelyn Hurd"
		console.log(user.status); // print out "active"
	});
	
	
