<div class="control-group deform-field" ng-class="{'error' : $field.$invalid && $field.$dirty, 'success' : $field.$valid && $field.$dirty}">
  <label class="control-label" >{{label}} </label>
  <div class="controls controls-row">
  	<input type="text"  style="display:none">
  	<input type="text" readonly="true" value="{{ (instance[path]  || instance.get(path)) | date:'medium'}}" ng-click="openPicker()">
     <i class="icon-calendar" style="font-size:150%; cursor:pointer" ng-click="openPicker()"></i>
	 <span ng-repeat="(key, error) in $field.$error" ng-show="error && $field.$dirty" class="help-inline">{{$validationMessages[key]}}</span>
  </div>
</div>
<script type="text/ng-template"  id="datepicker-template-{{$id}}">
<div class="modal hide fade in span6" tabindex="-1" role="dialog" style="display: block;" aria-hidden="true"  ng-controller="dfControllerDatepickerModal">
    <div class="modal-header">
        <button type="button" class="close" data-dismiss="modal" ng-click="cancel()"><i class="icon-remove"></i></button>
        <h3> <span> {{label}} </span></h3>
    </div>
    <div class="modal-content" >
        <div class="modal-body" >
			<div class="row-fluid form"  >
				<div class="control-group"  >
					<div class="controls controls-row">
						<div id="datepicker{{$id}}" ng-class="showTimepicker?'span6':'span12'" data-deform="appointment.$datepicker()"  ></div>
						<div id="timepicker{{$id}}" class="span6" data-deform="appointment.$timepicker()" ng-if="showTimepicker" ></div>
					</div>
				</div>												
			</div>
        </div>
    </div>
    <div class="modal-footer">
        <span class="btn btn-success" data-success="modal" ng-click="ok()" >Confirm</span>
        <span class="btn" data-dismiss="modal" ng-click="cancel()">Cancel</span>
    </div>
</div>
 
</script>