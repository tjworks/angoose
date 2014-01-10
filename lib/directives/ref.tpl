<div class="control-group deform-field">
	<div class="control-label">
	  	<label class="control-label"><%= deform.name %></label>
	</div>
  	<div class="controls">
		<div class="ref-type">
			<% if (deform._type) {%>
				<% if (_.isArray(deform._type)) {%>
					<select class="deform-ref-type-selector span2">
						<% _.each(deform._type, function(t){ %>
							<% if (t == _data.type) {%>
								<option value="<%= t %>" selected="selected"><%= t %></option>					
							<% } else { %>
								<option value="<%= t %>"><%= t %></option>
							<% } %>
						<% }) %>
					</select>
				<% } else { %>
					<%= deform._type %>
				<% } %>
			<% } %>
		</div>
		<input type="hidden" class="ref-selector" value="<%= _id.val() %>"/>
  	</div>
</div>
