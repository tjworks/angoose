/**
 * Deform field directives
 *  
 * 
 * Usage:
 * 
 * 
 */
(function(){
    
 
angular.module('angoose.ui.controllers').controller("dfc-selector", function($scope, $injector, $schema, $ui, inputElement, templateElement, $timeout){
        enterscope($scope, "selector ctrl: "+ $scope.path);
        window.s2em = inputElement;
        window.selscope = $scope;
        var scope = $scope;
        var pathSchema = $schema;  
        //console.log("selector pat schema is ", $schema)
        if(!pathSchema) return;
        
        var refModelName = $ui.camelcase(  $ui.getReference(pathSchema) ); 
        var isRefArray = Array.isArray(pathSchema.options.type);
        //var isRef = 
        console.log("Is ref:", refModelName, isRefArray );
        if(!refModelName && ! isRefArray) return ;
        
        var refModel = $injector.get(refModelName);

        function format(objId){
            
            var object =  optionCandidates[objId] || objId;
            //console.log("formating result", object)
            if(object && object.getDisplayName) return object.getDisplayName();
            
            if($ui.getter(object, 'meta.name.first')) return object.meta.name.first +" "+ object.meta.name.last;
            if($ui.getter(object, 'meta.name')) return object.meta.name;
            if($ui.getter(object, 'name.first')) return object.name.first +" "+ object.name.last;
            if(object && object.name) return object.name;
            //if(object && object.type) return object.type + object._id
            
            return objId;
        }
        ///scope.select2name = scope.path.replace(/\./g, '_') +"Select2Options"
        // we keep the select2 query result in this variable for formatting lookup. We can't use object directly as value for the model. '
        var optionCandidates = {}; //@ todo: cache invalidation      
        scope.select2options = {
            placeholder: 'Please Select '+  refModelName,
            id: function(obj){
                 return (obj && obj._id) ? obj._id: obj;
            },
            formatResult: format,
            formatSelection:format,
            multiple: isRefArray,
            query: function(query){
                var filter = {} ;// query.term?{'meta.name': { $regex:query.term, $options:'i'} }:{};
                 if(query.term){
                    filter["$or"]= [{'meta.name':  { $regex:query.term, $options:'i'} }, {'meta.name.sortable':  { $regex:query.term, $options:'i'} } ];
                 }
                refModel.find(filter, {'meta.name':1, name:1,type:1}, function(err, results){  //@todo: generic name fields
                    
                    var data = _.map(results, function(off){
                        optionCandidates[off._id] = off;
                        return off 
                    });
                    //console.log("Query result", data.length) 
                    query.callback({results:data, more:false});
                });                       
            },
            initSelection:  initSelection
        }
        function initSelection(em, callback){
            var values = em.val? em.val() : em
            //console.log("#### initSelection", values)
            if(!values || (Array.isArray(values ) && values.length == 0))
                return;
            var values = Array.isArray(values)  ? values: [values];
            var selectedObjects = [];
            var lookupIDs = [];
            values.forEach(function(obj){
                var objId = typeof(obj) == 'string'? obj: obj._id;
                if(!optionCandidates[objId])  lookupIDs.push(objId);
                else selectedObjects.push(optionCandidates[objId]);
            })
            if(lookupIDs.length>0){
                //console.log("lookup ids", lookupIDs)
                refModel.find({_id: {'$in': lookupIDs} }, {'meta.name':1, name:1, type:1}, function(err, results){  //@todo: generic name fields 
                    results && results.forEach(function(res){
                        optionCandidates[res._id] = res;
                        selectedObjects.push(res);
                    });
                    callback(selectedObjects);
                });    
            }
            else{
                callback(selectedObjects);
            }
        }  
        // the ngModel is not initialized at this point, so we need to wait a bit after ngModel is rendered
        
        scope.$watch(inputElement.attr('ng-model'), function(curr, old){
            if(!curr || ( !Array.isArray(curr) && ! curr._id) ) return;
            
            var ids = [];
            curr = Array.isArray(curr)? curr: [curr];
            for(var i=0;i<curr.length;i++){
                var it = curr[i]
                if(!it._id) return;
                ids.push(it._id)
                it =  optionCandidates[it._id] || it;
                if(it.meta  || it.name ) // already populated
                    return;
            }
            
            initSelection(ids, function(selectedObjects){
                var obj = Array.isArray(selectedObjects) && selectedObjects.length == 1? selectedObjects[0] : selectedObjects;
                inputElement.controller("ngModel").$setViewValue( obj );
            });
            /**
            console.log("Ref model value", curr)
            if(curr   && curr._id && ! optionCandidates[curr._id]){
              //@todo generic field  
                refModel.findById(curr._id, {'meta.name':1, name:1}, function(err, obj){
                    if(err){
                        console.error("Error loading ref field value", err);
                        return;
                    }
                    console.log("inital obj", obj);
                    inputElement.controller("ngModel").$setViewValue(obj);
                    optionCandidates[obj._id] = obj;
                })
            }*/
        })
        
});
 
 


})();  // end enclosure