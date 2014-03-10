AngooseClient.logger.info("Loading angoose-forms extension");
angular.module('angoose.ui',['angoose.client',
                'angoose.ui.services', 
                'angoose.ui.directives', 
                'angoose.ui.controllers', 
                'angoose.ui.templates', 
                'angoose.ui.filters', 
                'fake']);

angular.module('angoose.ui.services', []);
angular.module('angoose.ui.directives', ['angoose.ui.services']);
angular.module('angoose.ui.controllers', ['angoose.ui.services']);
angular.module('angoose.ui.filters', ['angoose.ui.services']);
angular.module('angoose.ui.templates', ['angoose.ui.services']);

// udnerscore
angular.module('fake', []).factory('MessageBox', function(){
    function noop(msg,cb){console.log("MessageBox", arguments); cb && cb() };
    return {
        error: noop, success:noop,warn:noop, confirm:noop
    }
});
  