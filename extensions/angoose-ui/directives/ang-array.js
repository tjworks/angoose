angular.module('angoose.ui.directives').directive("angArray", function($ui){
  var directive = {
      restrict:'AE',
      scope:{
          instance:'=',
          path:'=',
          modelSchema:'=',
          fieldSchema:'='
      },
      compile: function(element, attrs){
          //element.html("sub elements");
          return function link(scope, element, attrs){
              enterscope(scope, "array path "+ scope.path)
              var getter = scope.getter = $ui.getter;
              scope.fieldSchema = $ui.getFieldSchema(scope);
              if(!scope.fieldSchema){
                  console.error("No field schema found");
                  return;
              }
              scope.fieldSchema.options = scope.fieldSchema.options || {};
              if(scope.fieldSchema.caster && scope.fieldSchema.caster.options)   // REFACTOR
                    angular.extend(scope.fieldSchema.options, scope.fieldSchema.caster.options);
              
              scope.items = scope.instance.get(scope.path) || [];
              scope.instance.set(scope.path, scope.items);
              scope.addItem = function(){
                  scope.items.push( "" );
              }
              
              $ui.resolveAndCompile(scope, element, attrs, null, 'deform.array.tpl');
          }
      }
  };
  return directive;   
});