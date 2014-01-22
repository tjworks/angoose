'use strict';

/**
 * The main TodoMVC app module
 *
 * @type {angular.Module}
 */
var todomvc = angular.module('todomvc', ['ngRoute', 'angoose.client']).config(['$routeProvider','$locationProvider', function($routeProvider, $locationProvider) {
    $routeProvider.when('/:selectedStatus?', {templateUrl:'todomvc-index.html', controller: 'TodoCtrl'})
    
     $locationProvider.html5Mode(true);
}]);

/** controller */
todomvc.controller('TodoCtrl', function TodoCtrl($scope, $location, Todo, filterFilter, $routeParams) {
        var todos = $scope.todos = Todo.$query();
    
        $scope.status = '';
    
        $scope.newTodo = '';
        $scope.remainingCount = filterFilter(todos, {completed: false}).length;
        $scope.editedTodo = null;

        if ($location.path() === '') {
                $location.path('/');
        }

        $scope.location = $location;

        $scope.$watch('status', function (status) {
                $scope.statusFilter = { 'active': {completed: false}, 'completed': {completed: true} }[status];
        });

        $scope.$watch('remainingCount == 0', function (val) {
                $scope.allChecked = val;
        });

        $scope.addTodo = function () {
                var newTodo = $scope.newTodo.trim();
                if (newTodo.length === 0) {
                        return;
                }

                var todo = new Todo({
                        title: newTodo,
                        completed: false
                });
                todo.save(function(err,res){
                    if(err) return alert(err);
                    
                    todos.push(todo);
                    $scope.newTodo = '';
                    $scope.remainingCount++;    
                });
        };

        $scope.editTodo = function (todo) {
                $scope.editedTodo = todo;
        };

        $scope.doneEditing = function (todo) {
                $scope.editedTodo = null;
                todo.title = todo.title.trim();

                if (!todo.title) {
                        $scope.removeTodo(todo);
                }
                todo.save(function(err, res){
                    if(err) alert(err);  
                })
        };

        $scope.removeTodo = function (todo) {
                $scope.remainingCount -= todo.completed ? 0 : 1;
                todo.remove(function(err, res){
                    todos.splice(todos.indexOf(todo), 1);    
                });
        };

        $scope.todoCompleted = function (todo) {
                $scope.remainingCount += todo.completed ? -1 : 1;
                todo.save();
        };

        $scope.clearCompletedTodos = function () {
                angular.forEach(todos, function(todo){
                    if(todo.completed)  
                        todo.remove();
                });
        };

        $scope.markAll = function (completed) {
                todos.forEach(function (todo) {
                        todo.completed = !completed;
                        todo.save();
                });
                $scope.remainingCount = completed ? 0 : todos.length;
                //todoStorage.put(todos);
        };
});
