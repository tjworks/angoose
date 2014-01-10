<div class="control-group deform-field">
  	<label class="control-label"><%= params.title %></label>
  	<div class="controls">
		<select class="deform-out<%= (params.css_class) ? " " + params.css_class : "" %>" <%= (params.multiple) ? "multiple" : "" %> style="width:<%= params.width %>px;">
			<option value=""></option>
			<% _.each(FORM_DATA[params.data_name], function(o) { %>
				<option value="<%= o._id %>"><%= o.text %></option>
			<% }) %>
		</select>
  	</div>
</div>
