<style type="text/css">
    input.ng-pristine.select2-offscreen.fake-hidden{ z-index:-1 !important;position: relative !important;left: -1px !important;width: 1px !important;}
</style>
<div class="control-group deform-field" ng-class="{'error' : $field.$invalid && $field.$dirty, 'success' : $field.$valid && $field.$dirty}">
    <label class="control-label" >{{label}} </label>
    <div class="controls">
        <input type="text" class="fake-hidden"  ui-select2="select2options">
        <span ng-repeat="(key, error) in $field.$error" ng-show="error && $field.$dirty" class="help-inline">{{$validationMessages[key]}}</span>
    </div>
</div> 