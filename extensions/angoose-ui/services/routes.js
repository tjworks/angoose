angular.module('angoose.ui.services').config(['$routeProvider', function($routeProvider ) {
    console.log("configuring angoose-ui routes");
    $routeProvider.
    when("/deform/:modelName/list-:customController", {template: $angooseTemplateCache('deform.list.tpl')}).
    when("/deform/:modelName/list", {template: $angooseTemplateCache('deform.list.tpl')}).
    when("/deform/:modelName/create", {template:$angooseTemplateCache('deform.edit.tpl')}).
    when("/deform/:modelName/update/:modelId", {template:$angooseTemplateCache('deform.edit.tpl')}).
    when("/deform/:modelName/view/:modelId", {template:$angooseTemplateCache('deform.view.tpl')});

}]);
 