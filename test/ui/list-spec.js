'use strict';
describe('ang list', function() {
    var $compile, $scope, em;
     var mockRes = [
            {email:'email@demo.com', status:'inactive', password:'password'}
        ]
    beforeEach(function(){
        module('ngRoute');
        module( 'angoose.ui');
        //angular.mock.module('epf');
    });
   beforeEach(inject(function(_$compile_, _$rootScope_, $httpBackend) {
        $compile = _$compile_;
        $scope = _$rootScope_.$new();
         
       
        $httpBackend.when('POST','/angoose/rmi/AngooseUser/find').respond({ success:true, retval: mockRes });
        $httpBackend.when('POST','/angoose/rmi/AngooseUser/count').respond({ success:true, retval: 1  });
        $httpBackend.when('POST','test.tpl').respond('<div>Test Test Test</div>');
        //console.log("angList defined? ",angular.module('angoose.ui.directives').directive('angList'));
     }));
    it('ang-list should be evaluated',
        function($controller, $rootScope ,  $httpBackend , $ui ) {
                 
            $scope.instances = mockRes;         
            var html =  " <div ang-list model-name='AngooseUser' default-filter=''  ></ang-list>" ;
            em = $compile(angular.element(html))($scope); 
            $scope.$digest();
                 
            expect(em && em.html()).toContain('New AngooseUser');
            //expect(em && em.html()).toContain('email@demo.com');
            expect($scope.dmeta && $scope.dmeta.modelName).toBe('AngooseUser');
            
    });
    it('accepts template-url ',
             function($controller, $rootScope ,  $httpBackend , $ui ) {

            $angooseTemplateCache('test.tpl', '<div>Test Token</div>');
            var html =  " <div ang-list model-name='AngooseUser'  template-url='test.tpl'  ></ang-list>" ;
            em = $compile(angular.element(html))($scope); 
            console.log("Compiled result:", em)
            $scope.$digest();
            expect(em && em.html()).toContain('Test Token');
            expect($scope.dmeta && $scope.dmeta.modelName).toBe('AngooseUser');
    });
});
  