<div class="control-group deform-field" ng-class="{'error' : $field.$invalid && $field.$dirty, 'success' : $field.$valid && $field.$dirty}">
  <label class="control-label" >{{label}} </label>
  <div class="controls">
     {{ instance.get(path) }}
  </div>
</div> 