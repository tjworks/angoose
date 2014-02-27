
angular.module('angoose.ui',['angoose.ui.service', 'angoose.ui.directives', 
                'angoose.ui.controllers', 'angoose.ui.templates', 'fake']).run(
function(){
                    
}); // end Run block

angular.module('angoose.ui.directives', ['angoose.ui.service']);
angular.module('angoose.ui.controllers', ['angoose.ui.service']);
angular.module('angoose.ui.templates', ['angoose.ui.service']);



// udnerscore
angular.module('fake', []).factory('MessageBox', function(){
    return {}
});
  