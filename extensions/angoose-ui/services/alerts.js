angular.module('angoose.ui.services').provider("$alert", function(){
     this.$get = function($rootScope){
            var Alert = {};
            var scope = $rootScope;
            var alerts = scope.alerts = [];
            function add(alert, delay){
                delay = delay || 1;
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
                }, delay);
            }
            Alert.info = function(msg, delay){
                add({type:'info', msg: msg});
            };
            Alert.warn = function(msg, delay){
                add({type:'warn', msg: msg}, delay);
            };
            Alert.success = function(msg, delay){
                add({type:'success', msg: msg}, delay);
            }
            Alert.error = function(msg, delay){
                //msg = _formatError(msg);
                add({type:'error', msg: msg}, delay);
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
        }
 });
    

