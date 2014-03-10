	<div class="row-fluid">
		<h4>
		</h4>
	</div>	
	<div class="row-fluid tab-content">
		<div class="box">
			<div class="box-header">
				<h2><i class="icon-list"></i><span class="break"></span>{{ dmeta.modelName }} Information</h2>
			</div>
			<div class="box-content">
				<form class="deform-form form-horizontal span12 readonly" name="modelForm" ng-submit="saveForm()">
					<fieldset class="deform-set" ng-repeat="(groupName, groupPaths) in groups">
						<legend ng-if="groupName">{{groupName | camelcase }}</legend>
	 					<div ng-repeat="(path, pathData) in groupPaths">
	 						<!-- single instance sub schema -->
							<deform-field ng-model="instance.{{path}}" path="path" field-schema="pathData" model-schema="dmeta.modelSchema" instance="instance" ></deform>
	 					</div>  
					</fieldset>
					<div class="form-actions">
						<a class="btn btn-success" href="/angoose/{{ dmeta.modelName}}/update/{{ instance._id }}"  >   Edit {{ dmeta.modelName }}  </a>
						<a class="btn btn-inverse" href="/angoose/{{ dmeta.modelName}}/list"  > Return </a>
					</div>
				</form>
				<div class="clearfix"></div>
			</div>
		</div>
	</div>
