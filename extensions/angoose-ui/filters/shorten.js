'use strict'
angular.module('angoose.ui.filters').filter('shorten', function(){
    return function(str){
         if(typeof(str)!='string') return str;
         
         var re = /^.*\/([\/]+)$/
         var m = re.exec(str);
         if(m) return m[1];
         return str.length<50? str:  "..."+str.substring(str.length-50, str.length);
    }
});