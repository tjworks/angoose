<div class="control-group redactor-container"ng-class="{'error' : $field.$invalid && $field.$dirty, 'success' : $field.$valid && $field.$dirty}">
  <label class="control-label" style="max-height:30px"></label>
  <div class="controls">
    <textarea  class="span6" rows="5"   cols="20" rows="15" redactor></textarea>
    <span class="help-inline" ng-repeat="error in $fieldErrors" >{{$validationMessages[error](this)}}</span>
  </div>
</div>
 