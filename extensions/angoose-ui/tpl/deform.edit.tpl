	<div class="row-fluid">
		<h4>
		</h4>
	</div>	
	<div class="row-fluid tab-content">
		<div class="box">
			<div class="box-header">
				<h2><i class="icon-list"></i><span class="break"></span>
					Edit {{ $form.modelName }} </h2>
			</div>
			<div class="box-content">
				<form class="deform-form form-horizontal span12" name="modelForm" ng-submit="saveForm()">
					<fieldset class="deform-set" ng-repeat="groupName in groups.sorted_groups" ng-init="groupPaths = groups[groupName]">
						<legend ng-if="groupName">{{groupName | camelcase }}</legend>
						
						<div ng-repeat="path in groupPaths.sorted_paths" ng-init="pathData = groupPaths[path]"> 
	 						<!-- single instance subschema -->
	 						
							<deform-field  path="path" field-schema="pathData" model-schema="$form.modelSchema" instance="instance"  ></deform-field>
	 					</div>  
					</fieldset>
					<div class="form-actions">
						<button class="btn btn-success"  type="submit">Save </button>
						<button class="btn btn-danger" type="button" ng-click="cancelEdit()">Cancel </button>
					</div>
				</form>
				<div class="clearfix"></div>
			</div>
		</div>
	</div>
