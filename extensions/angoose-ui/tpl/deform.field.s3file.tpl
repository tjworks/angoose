<div class="control-group deform-field" ng-class="{'error' : $field.$invalid && $field.$dirty, 'success' : $field.$valid && $field.$dirty}">
  <label class="control-label" >{{label}} </label>
  <div class="controls">
    	<input type="file" ng-file-select="onFileUpload($files)" > <small>{{ fieldSchema.options && fieldSchema.options.description }}</small>
    <div class="file-preview"  >
    	<img ng-src="{{ instance.get(path) }}" ng-if="instance.get(path).toLowerCase().indexOf('jpg')>0 || instance.get(path).toLowerCase().indexOf('png')>0 || instance.get(path).toLowerCase().indexOf('gif')>0">
    	<audio controls ng-if="instance.get(path).toLowerCase().indexOf('oga')>0 || instance.get(path).toLowerCase().indexOf('mp3')>0  ">
		  <source ng-src="{{ instance.get(path) }}" type="audio/oga" ng-if="instance.get(path).toLowerCase().indexOf('oga')>0  ">
		  <source ng-src="{{ instance.get(path) }}" type="audio/mpeg" ng-if="instance.get(path).toLowerCase().indexOf('mp3')>0 ">
		  Your browser does not support the audio tag.
		</audio>
		<div>
		<a href="{{  url }}" target="_blank">{{  url | shorten }}</a>
		</div>
    </div>
    <span ng-repeat="(key, error) in $field.$error" ng-show="error && $field.$dirty" class="help-inline">{{$validationMessages[key]}}</span>
  </div>
</div>
   