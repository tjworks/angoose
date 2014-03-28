<div class="control-group">
  <label class="control-label">{{ fieldSchema.options.label || 'missing model level schema label option' }}s</label>
  <div class="controls">
  		<div class="box-content">
  		 	<div class="row-fluid box "  ng-repeat="item in items track by $index" ng-init="itemPath = path +'['+ $index +']' ">
					
<!-- 						 <span class="item-label" >{{  ($index+1)  }}</span> -->
					<div class="ang-array-item-remove">
						<i class="icon-remove clickable icon-large" ng-click="items.splice($index,1)"></i>	
					</div>
					<div class="ang-array-item">
						<deform-field  path="path" item-index="$index" field-schema="fieldSchema" model-schema="modelSchema" instance="instance"  label=""></deform-field>
					</div>
					<div class="clearfix"></div>
			</div>
			<button class="btn btn-small" type="button" ng-click="addItem()"> Add <i class="icon-plus icon-large"></i></button>
        </div>
    </div>
     
</div> 