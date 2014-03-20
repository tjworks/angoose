'use strict'
angular.module('angoose.ui.filters').filter('trustAsHtml', function($sce){
    return function(text) {
        return $sce.trustAsHtml(text);
    };
});
