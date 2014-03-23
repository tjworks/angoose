<div class="control-group deform-field" ng-class="{'error' : $field.$invalid && $field.$dirty, 'success' : $field.$valid && $field.$dirty}">
  <label class="control-label" >{{label}} </label>
  <div class="controls">
    <input type="text"> <small>{{ fieldSchema.options && fieldSchema.options.description }}</small>
    <div class="url"  >
    	<img src="{{ instance.get(path) }}" ng-if="instance.get(path).toLowerCase().indexOf('jpg')>0 || instance.get(path).toLowerCase().indexOf('png')>0 || instance.get(path).toLowerCase().indexOf('gif')>0">
    	<audio controls ng-if="instance.get(path).toLowerCase().indexOf('ogg')>0 || instance.get(path).toLowerCase().indexOf('mp3')>0  ">
		  <source src="{{ instance.get(path) }}" type="audio/ogg" ng-if="instance.get(path).toLowerCase().indexOf('ogg')>0  ">
		  <source src="{{ instance.get(path) }}" type="audio/mpeg" ng-if="instance.get(path).toLowerCase().indexOf('mp3')>0 ">
		  Your browser does not support the audio tag.
		</audio>
    </div>
    <span ng-repeat="(key, error) in $field.$error" ng-show="error && $field.$dirty" class="help-inline">{{$validationMessages[key]}}</span>
  </div>
</div>


http://www.w3schools.com/tags/horse.mp3