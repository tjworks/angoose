<div class="control-group deform-field">
  	<label class="control-label"><%= params.title %></label>
  	<div class="controls">
		<% _.each(params.options, function(o){ %>
			<label class="checkbox">
				<input type="checkbox" class="deform-out" value="<%= o.value %>">
				<%= o.option %>
			</label>
		<% }) %>
		<% if (params.description) { %>
			<div class="well well-small">
			    <span class="help-block"><%= params.description %></span>
			</div>
		<% } %>
  	</div>
</div>
