<div class="control-group deform-field">
  	<label class="control-label"><%= params.title %></label>
  	<div class="controls controls-row">
		<% if (_.contains(params.fields, "title")) {%>
		  	<input class="span1 deform-out" data-deform-subfield="title" type="text" placeholder="Title">		
		<% } %>
		<% if (_.contains(params.fields, "first")) {%>
	  		<input class="span3 deform-out" data-deform-subfield="first" type="text" placeholder="First">
		<% } %>
		<% if (_.contains(params.fields, "middle")) {%>
	  		<input class="span3 deform-out" data-deform-subfield="middle" type="text" placeholder="Middle">
		<% } %>
		<% if (_.contains(params.fields, "last")) {%>
	  		<input class="span4 deform-out" data-deform-subfield="last" type="text" placeholder="Last">
		<% } %>
		<% if (_.contains(params.fields, "suffix")) {%>
	  		<input class="span1 deform-out" data-deform-subfield="suffix" type="text" placeholder="Suffix">
		<% } %>
		<% if (params.description) { %>
			<div class="clearfix"></div>
			<div class="well well-small">
			    <span class="help-block"><%= params.description %></span>
			</div>
		<% } %>
  	</div>
</div>
