<div class="control-group">
  <label class="control-label">{{ subschema.options.label || 'missing model level schema label option' }}s</label>
  <div class="controls">
  		<fieldset class="deform-set">
  		 	<div class="row-fluid box "  ng-repeat="item in sublist($id)">
				<div class="box-content">
					<i class="icon-remove clickable icon-large" ng-click="removeSublistItem($index)"></i>
					<a type="button" ng-model="item.__toggle" btn-checkbox btn-checkbox-true="1" btn-checkbox-false="0">
						 <span class="item-label" >
						{{  getter(item, subschema.options.keyfield)  ||  ( (subschema.options.label || fieldSchema.path) + ' #'+($index+1)) }}
						 </span>
						<i class="icon-expand-alt icon-large"   ng-show="!item.__toggle"></i> 
						<i class="icon-collapse-alt icon-large" ng-show="item.__toggle"></i>
					</a>
 					<div ng-repeat="  subpath in subpaths" ng-show="item.__toggle"  ng-init="subpathSchema = subschema.paths[subpath]">
 						<span ng-if="subpath.indexOf('-')<0">
							<deform-field  path="subpath" field-schema="subpathSchema" model-chema="modelSchema" instance="item"  ></deform>
						</span>
 					</div>  
					<div class="clearfix"></div>
				</div>
			</div>
			<button class="btn btn-small" type="button" ng-click="addSublistItem()">New {{ subschema.options.label || fieldSchema.path }} <i class="icon-plus icon-large"></i></button>
		</fieldset>
        
    </div>
     
</div> 