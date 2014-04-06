<div class="box">
    <div class="box-header">
      <h2><i class="icon-list"></i><span class="break"></span>
      	{{ dmeta.pageTitle }}
	</h2>
      
       <div class="box-icon">
				<div deform-paginator  page-size="25"  ></div>
		</div>
		
      	<div class="box-icon"  ng-if=" dmeta.showAdd ">
        	<a class="btn" href="/angoose/{{ dmeta.modelName }}/create"><i class="icon-plus"></i> New {{ dmeta.modelName }}  </a>
       	</div>
       	
    </div>
    <div id="object-list" class="box-content">
      <table class="table">
        <thead>
          <tr>
          	<!--ng-click="sort($event, fieldSchema.path)"-->
            <th ng-repeat="fieldSchema in dmeta.columns" 
            	ng-class="{'sort-clickable': fieldSchema.options.sortable }"  >
            	<span deform-sortable="{{ fieldSchema.path }}">
            		{{ fieldSchema.options.label }}
            	</span>
            </th>
            <th ng-if="dmeta.actionColumn">Actions</th>
          </tr>
        </thead>
        
        <thead >
			<tr >
				<th ng-repeat="fieldSchema in dmeta.columns" >
						<input type="text" deform-filter-op="contains" deform-filter-by="{{ fieldSchema.path }}" placeholder="Search by {{ fieldSchema.options.label}}" ng-show="searchable">
				</th>
				<th>
				</th>
			</tr>
		</thead>
        <tbody >
          <tr ng-repeat="instance in instances" ng-init="rowIndex=$index">
          	<td ng-repeat="fieldSchema in dmeta.columns" >
          		<deform-render row="{{ rowIndex}}">{{ value }}</deform-render>
          	</td>
            <td  ng-if="dmeta.actionColumn">
              	<deform-render row="{{rowIndex}}" path="$ACTION"></deform-render>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <div class="box-header">
      <div class="box-icon">
        <span data-deform="$pager()"></span>
      </div>
    </div>
</div>


<script type="text/ng-template" id="deform-list-action-view-edit">
	<a class="btn"  href="/angoose/{{ dmeta.modelName}}/view/{{instance._id}}">View</a> 
	<a class="btn"  href="/angoose/{{ dmeta.modelName}}/update/{{instance._id}}">Edit</a>
</script>
<script type="text/ng-template" id="deform-list-action-edit-delete">
	<a class="btn"  href="/angoose/{{ dmeta.modelName}}/update/{{instance._id}}">Edit</a>  
	<span class="btn"  ng-click="remove($index)" >Delete</span>
</script>
<script type="text/ng-template" id="deform-list-action-view-edit-delete">
	<a class="btn"  href="/angoose/{{ dmeta.modelName}}/view/{{instance._id}}">View</a> 
	<a class="btn"  href="/angoose/{{ dmeta.modelName}}/update/{{instance._id}}">Edit</a>  
	<span class="btn"  ng-click="remove($index)" >Delete</span>
</script>
