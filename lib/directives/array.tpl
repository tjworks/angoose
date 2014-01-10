<div class="deform-set-container deform-field">
	<fieldset class="deform-set">
		<legend><%= deform.name %></legend>
		<div class="deform-items"></div>
		<div class="control-group">
		  	<div class="controls deform-array-add">
				ADD <%= (deform.item_name || "").toUpperCase() %> <i class="icon-plus"></i>
		  	</div>
		</div>
	</fieldset>
</div>
