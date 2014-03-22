(function(){
angular.module('angoose.ui.directives').directive('deformPaginator', function( $ui, $http, $templateCache){
    // this sub directive handles the paging. It can only used inside the the spflist
    var directive = {
        restrict:'A',
        template: paginatorTemplate() 
        //scope:true
    }
    directive.link =function($scope,$element, $attrs){
            enterscope($scope, "paginator");
            if(!$scope.dmeta) throw "Paginator must be used in deform-listing scope"
            var spec = $scope.dmeta.spec;
            spec.page = 1;
            spec.start = 1;
            spec.pageSize = 25;
            if($attrs.pageSize)
                spec.pageSize = parseInt($attrs.pageSize)
            spec.$end = spec.start + spec.pageSize -1;

            $scope.nextPage = function(e){
                console.log("next page clicked", arguments)
                if(  spec.start + spec.pageSize > spec.$total) return;
                $scope.setPage (spec.page + 1);
            }
            $scope.previousPage = function(){
                console.log("previous page clicked")
                if( spec.page <=1) return;
                $scope.setPage(spec.page -1);
            }
            $scope.setPage = function(pageNo){
                console.log("Set page called with number ", pageNo );
                spec.page = pageNo || spec.page ;
                spec.start = (spec.page -1 ) * spec.pageSize + 1
                spec.$end = spec.start + spec.pageSize -1;
            }
            //$scope.setPage();
            $scope.paginator = spec;
        }
    return directive;
});
  

function paginatorTemplate(){
    return "<span class='btn-group' style='display: inline;'> {{ paginator.start }} - {{ paginator.$end > paginator.$total ? paginator.$total: paginator.$end }} of {{ paginator.$total }}\n" +
            " <span class='break'></span>" +
            " <span ng-if='paginator.pageSize < paginator.$total' >"+
            "    <span href='#' class='btn box-page' ng-click='previousPage()' style='cursor:pointer' ><i class='icon-chevron-left'></i></span>" +
            "    <span href='#' class='btn box-page' ng-click='nextPage()' style='cursor:pointer'><i class='icon-chevron-right'></i></span>" +
            "  </span>"+ 
            "</span>\n" + 
            "";
}

})(); // scope wrapper
 