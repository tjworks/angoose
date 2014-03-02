angular.module('angoose.ui.services').factory("$alert", function($rootScope){
    var Alert = {};
    var scope = $rootScope;
    var alerts = scope.alerts = [];
    function add(alert){
        setTimeout(function(){
            // doing this outside angular context
            var existing = null;
            for(var i in alerts){
                var item = alerts[i];
                if(item.type == alert.type && item.msg == alert.msg ){
                    existing = item; 
                    break;
                }
            }
            if(!existing){
                alerts.push(alert);
                scope.$digest();
            }
        });
    }
    Alert.info = function(msg){
        add({type:'info', msg: msg});
    };
    Alert.warm = function(msg){
        add({type:'warn', msg: msg});
    };
    Alert.success = function(msg){
        add({type:'success', msg: msg});
    }
    Alert.error = function(msg){
        //msg = _formatError(msg);
        add({type:'error', msg: msg});
    }
    Alert.clear = function(){
        setTimeout(function(){
             alerts.length = 0;
             scope.$digest();    
        })
        
    }
    scope.removeAlert  = function($index){
         if(alerts[$index]){
             setTimeout(function(){
                alerts.splice($index,1);
                scope.$digest();     
             })
         }
    }
    return Alert;
});
    

