<div class="control-group deform-field">
  	<label class="control-label"><%= deform.name %></label>
  	<div class="controls">
      <label class="checkbox">
        <input type="checkbox" class="deform-out">
      </label>
		<% if (deform.description) { %>
			<div class="well well-small">
			    <span class="help-block"><%= deform.description %></span>
			</div>
		<% } %>
  	</div>
</div>
