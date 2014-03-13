<div class="control-group deform-field" ng-class="{'error' : $field.$invalid && $field.$dirty, 'success' : $field.$valid && $field.$dirty}">
    <label class="control-label" >{{label}} </label>
    <div class="controls">
        <input type="hidden" ui-select2="select2options">
        <span ng-repeat="(key, error) in $field.$error" ng-show="error && $field.$dirty" class="help-inline">{{$validationMessages[key]}}</span>
        <input ng-if="fieldSchema.options.required" class="patch-for-select2" style=" z-index:-1 ;position: relative ;left: -20px ;max-width: 1px ;" type="text" value="{{$field.$viewValue}}" required/>
    </div>
</div>
