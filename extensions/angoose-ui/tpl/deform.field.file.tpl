<div class="control-group deform-field" ng-class="{'error' : $field.$invalid && $field.$dirty, 'success' : $field.$valid && $field.$dirty}">
  <label class="control-label" >{{label}} </label>
  <div class="controls">
    	<input type="file" ng-file-select="onFileUpload($files)" onchange="console.log('!!!!'); angular.element(this).scope().onFileUpload(event)"> <small>{{ fieldSchema.options && fieldSchema.options.description }}</small>
    	
    <div class="file-preview"   >
    	<img  style="max-width:300px;max-height:100px" ng-src="{{ dataUri }}" ng-if="dataUri && fieldSchema.options.accept.join('').indexOf('image')>=0" >
    	
    	<audio controls ng-if="dataUri &&  fieldSchema.options.accept.join('').indexOf('audio')>=0">
		  <source ng-src="{{ dataUri }}" type="audio/oga" ng-if="fieldSchema.options.accept.join('').indexOf('ogg')>=0">
		  <source ng-src="{{ dataUri }}" type="audio/mpeg" ng-if="fieldSchema.options.accept.join('').indexOf('mp')>=0">
		  Your browser does not support the audio tag.
		</audio>
 
    <video controls ng-if="dataUri &&  fieldSchema.options.accept.join('').indexOf('video')>=0" width="320" height="240">
      
      <source ng-src="{{ dataUri }}" type="video/webm" ng-if="fieldSchema.options.accept.join('').indexOf('webm')>=0">
      Your browser does not support the video tag.
    </video>

		<div>
		<a href="{{  url }}" target="_blank">{{  url | shorten }}</a>
		</div>
    </div>
    <span ng-repeat="(key, error) in $field.$error" ng-show="error && $field.$dirty" class="help-inline">{{$validationMessages[key]}}</span>
  </div>
</div>
   