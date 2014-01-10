<div class="control-group deform-field">
  	<label class="control-label"><%= deform.name %></label>
  	<div class="controls">
		<select class="deform-out span">
			<% _.each(deform.options, function(o){ %>
				<% if (o == _data) {%>
					<option value="<%= o %>" selected="selected"><%= o %></option>					
				<% } else { %>
					<option value="<%= o %>"><%= o %></option>
				<% } %>
			<% }) %>
		</select>
		<% if (deform.description) { %>
			<div class="well well-small">
			    <span class="help-block"><%= deform.description %></span>
			</div>
		<% } %>
  	</div>
</div>
