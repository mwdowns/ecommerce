var app = angular.module('store', ['ui.router', 'ngCookies']);

app.config(function($stateProvider, $urlRouterProvider) {
  $stateProvider
    .state({
      name: 'home',
      url: '/',
      templateUrl: 'home.html',
      controller: 'MainController'
    })
    .state({
      name: 'product_details',
      url: '/product/{product_id}',
      templateUrl: 'product_details.html',
      controller: 'DetailsController'
    })
    .state({
      name: 'signup',
      url: '/signup',
      templateUrl: 'signup.html',
      controller: 'SignupController'
    })
    .state({
      name: 'login',
      url: '/login',
      templateUrl: 'login.html',
      controller: 'LoginController'
    });
  $urlRouterProvider.otherwise('/');
});

app.factory('riceService', function($http, $cookies, $rootScope) {
  var service = {};
  var cookie = $cookies.getObject('data');
  console.log(cookie.user_name);
  $rootScope.user_name = cookie.user_name;
  service.getProducts = function() {
    var url = "/api/products";
    return $http({
      method: "GET",
      url: url
    });
  };
  service.getDetails = function(id) {
    var url = '/api/product/' + id;
    return $http({
      method: "GET",
      url: url
    });
  };
  service.signup = function(formData) {
    var url = '/api/user/signup';
    return $http({
      method: 'POST',
      url: url,
      data: formData
    });
  };
  service.login = function(formData) {
    var url = '/api/user/login';
    return $http({
      method: 'POST',
      url: url,
      data: formData
    });
  };

  return service;
});

app.controller("MainController", function($scope, riceService, $stateParams, $state) {
  riceService.getProducts().success(function(results) {
    $scope.results = results;
    $scope.getItemId = function(item) {
      $scope.id = item.id;
    };
  });
});

app.controller("DetailsController", function($scope, riceService, $stateParams, $state) {
  $scope.id = $stateParams.product_id;
  riceService.getDetails($scope.id).success(function(item) {
    $scope.name = item.name;
    $scope.description = item.description;
    $scope.image = item.image_path;
  });
});

app.controller('SignupController', function($scope, riceService, $stateParams, $state) {
  $scope.signupSubmit = function() {
    if ($scope.password != $scope.confirmPassword) {
      $scope.passwordsdontmatch = true;
    }
    else {
      $scope.passwordsdontmatch = false;
      var formData = {
        username: $scope.username,
        email: $scope.email,
        password: $scope.password,
        first_name: $scope.firstName,
        last_name: $scope.lastName
      };
      riceService.signup(formData).success(function() {
        $state.go('login');
      });
    }
  };
});

app.controller("LoginController", function($scope, riceService, $stateParams, $state, $cookies, $rootScope) {
  $scope.login = function() {
    var formData = {
      username: $scope.username,
      password: $scope.password
    };
    riceService.login(formData).error(function(){
      $scope.wronglogin = true;
    });
    riceService.login(formData).success(function(data) {
      $cookies.putObject('data', data);
      $state.go('home');
    });
  };
});
