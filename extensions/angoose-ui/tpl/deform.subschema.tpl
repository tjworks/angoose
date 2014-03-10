 
<div deform-subschema>
	<div class="row-fluid">
		<h4>
		</h4>
	</div>	
	<div class="row-fluid tab-content">
		<div class="box">
			<div class="box-header">
				<h2><i class="icon-list"></i><span class="break"></span>
					<span ng-if="isNew">Create </span>
					<span ng-if="!isNew">Edit </span>
					{{ dmeta.modelName }} </h2>
			</div>
			<div class="box-content">
				<form class="deform-form form-horizontal span12" name="modelForm" ng-submit="saveForm()">
					<fieldset class="deform-set" ng-repeat="(groupName, groupPaths) in groups">
						<legend ng-if="groupName">{{groupName | camelcase }}</legend>
	 					<div ng-repeat="(path, pathData) in groupPaths">
	 						<span ng-if="pathData.schema">
		 							<deform-field ng-model="instance.{{path}}" path="path" field-schema="pathData" model-chema="modelClass.schema" instance="instance" template="" directive="" label="" controller=""></deform>
							</span>
	 					</div>  
					</fieldset>
					<div class="form-actions">
						<button class="btn btn-success"  type="submit">Save </button>
						<a  class="btn btn-inverse " href="/angoose/{{ dmeta.modelName }}/list">Cancel</a>
					</div>
				</form>
				<div class="clearfix"></div>
			</div>
		</div>
	</div>
</div>