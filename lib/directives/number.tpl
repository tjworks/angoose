<div class="control-group deform-field">
	<div class="control-label">
	  	<label class="control-label"><%= deform.name %></label>
		<% if (deform.description) { %>
			    <span class="help-block"><%= deform.description %></span>
		<% } %>
	</div>
  	<div class="controls">
		<% if (deform.multiline) {%>
			<textarea class="span8 deform-out" rows="5"></textarea>
		<% } else { %>
		  	<input type="text" class="deform-out">
		<% } %>
		<% if (deform.invalid) { %>
		    <span class="help-inline help-invalid"><%= deform.invalid %></span>
		<% } %>
  	</div>
</div>
