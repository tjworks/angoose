/**
 * Deform field directives
 *  
 * 
 * Usage:
 * 
 * 
 */
(function(){
angular.module('angoose.ui.controllers'  ).controller("dfc-s3file", function($scope , $injector, $upload, $schema, angoose , $alert){
    enterscope($scope, "File upload");
    var accept  = $schema.options.accept || [];
    $scope.$validationMessages = {
        "validFileType": "Only these file types are accepted: "+ accept.join(", ")
    }
   
     $scope.$watch('$field.$modelValue', function(){
            var vals = $scope.instance.get($scope.path);        
            if($scope.itemIndex !== undefined && vals.length)
                $scope.url = vals[$scope.itemIndex];
            else 
                $scope.url = Array.isArray(vals)?"":vals;
    });
    $scope.onFileUpload = function($files){
        console.log("file uploaded", $files);
        var $file = $files[0];
        $scope.$field.$setValidity('validFileType', true );
        if( accept  && accept.length && accept.indexOf($file.type) <0  ){
            $scope.$field.$setViewValue('');
            $scope.$field.$setValidity('validFileType', false );
            return;
        }
        var bucket = $schema.options.bucket;
        var filePath = $schema.options.filepath;
        var key = {};
        $scope.instance.getS3Key(bucket, filePath, $file.name, $file.type ).then(function(key) {
            $upload.upload({
                url: 'https://' +  bucket + '.s3.amazonaws.com',
                method: 'POST',
                data: {
                    'key': key.path,
                    'AWSAccessKeyId': key.accesskey,
                    'acl': 'public-read',
                    'policy': key.policy,
                    'signature': key.signature,
                    'success_action_status': '201',
                    'Content-Type': key.mime_type
                },
                file: $file
            }).success(function(data) {
                if(data){
                   var s3file = unescape($($.parseXML(data)).find('Location').text());
                   angoose.logger.debug("S3 uploaded successfully: ", s3file);
                   //$scope.instance.set($scope.path, unescape($($.parseXML(data)).find('Location').text())  );
                   $scope.$field.$setViewValue(s3file);
                }
            }).error(function(data){
                angoose.logger.error("S3 Upload failed", data);
                $alert.error("S3 Upload failed: "+  data);
                $scope.$field.$setViewValue('');
            });
        }, function(err){
            angoose.logger.debug("S3Key  error", err);
            $scope.$field.$setViewValue('');
        });

    };
});
 
})();  // end enclosure