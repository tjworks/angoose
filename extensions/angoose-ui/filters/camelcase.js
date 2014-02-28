'use strict'
angular.module('angoose.ui.filters').filter('camelcase', function(){
    return function(string){
         if(!string || string.length ==0) return string;
         return string.substring(0,1).toUpperCase() + string.substring(1)
    }
});