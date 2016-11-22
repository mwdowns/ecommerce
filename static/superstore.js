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
    })
    .state({
      name: 'viewCart',
      url: '/viewcart',
      templateUrl: 'viewCart.html',
      controller: 'CartController'
    })
    .state({
      name: 'checkout',
      url: '/checkout',
      templateUrl: 'checkout.html',
      controller: 'CheckoutController'
    })
    .state({
      name: 'thanks',
      url: '/thanks',
      templateUrl: 'thanks.html'
    });

  $urlRouterProvider.otherwise('/');
});

app.factory('riceService', function($http, $cookies, $rootScope, $state) {
  var service = {};
  if (!$cookies.getObject('cookie_data')) {
    $rootScope.user_name = 'Guest';
    $rootScope.loggedIn = false;
  }
  else {
    var cookie = $cookies.getObject('cookie_data');
    $rootScope.user_name = cookie.user_name;
    $rootScope.auth_token = cookie.token;
    $rootScope.loggedIn = true;
  }
  $rootScope.logout = function() {
    $cookies.remove('cookie_data');
    $rootScope.user_name = 'Guest';
    $rootScope.auth_token = null;
    $state.go('home');
  };
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
    }).success(function(login_data) {
      $cookies.putObject('cookie_data', login_data);
      $rootScope.user_name = login_data.user_name;
      $rootScope.auth_token = login_data.token;
      console.log('hey');
    });
  };
  service.addToCart = function(addToCartData) {
    var url = '/api/shopping_cart';
    return $http({
      method: 'POST',
      url: url,
      data: addToCartData
    });
  };
  service.viewCart = function() {
    var url = '/api/shopping_cart';
    return $http({
      method: 'GET',
      url: url,
      params: {
        auth_token: $rootScope.auth_token
      }
    });
  };
  service.checkout = function(formData) {
    var url = '/api/shopping_cart/checkout';
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

app.controller("DetailsController", function($scope, riceService, $stateParams, $state, $cookies, $rootScope) {
  $scope.id = $stateParams.product_id;
  riceService.getDetails($scope.id).success(function(item) {
    $scope.name = item.name;
    $scope.description = item.description;
    $scope.image = item.image_path;
  });
  $scope.addToCart = function() {
    if (!$rootScope.loggedIn) {
      $scope.rejected = true;
      $cookies.putObject('location', {product_id: $scope.id});
    }
    else {
      var addToCartData = {
        auth_token: $rootScope.auth_token,
        product_id: $scope.id
      };
      riceService.addToCart(addToCartData);
      $state.go('viewCart');
    }
  };
});

app.controller("SignupController", function($scope, riceService, $cookies, $stateParams, $state) {
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
        if ($cookies.getObject('location')) {
          var cookie = $cookies.getObject('location');
          console.log(cookie);
          $state.go('product_details', {product_id: Number(cookie.product_id)});
        }
        else {
          $state.go('login');
        }
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
    riceService.login(formData)
      .error(function(){
        $scope.wronglogin = true;
      })
      .success(function() {
        if ($cookies.getObject('location')) {
          var cookie = $cookies.getObject('location');
          $rootScope.loggedIn = true;
          $state.go('product_details', {product_id: Number(cookie.product_id)});
          $cookies.remove('location');
        }
        else {
          $state.go('login');
        }
      });
  };
});

app.controller("CartController", function($scope, riceService, $stateParams, $state, $cookies, $rootScope) {
  riceService.viewCart().success(function(resultsArr) {
    $scope.results = resultsArr;
    $scope.cart = resultsArr.product_query;
    $scope.total = resultsArr.total_price;
  });
});

app.controller("CheckoutController", function($scope, riceService, $stateParams, $state, $cookies, $rootScope) {
  $scope.checkoutSubmit = function() {
    var formData = {
      street_address: $scope.streetAddress,
      city: $scope.city,
      state: $scope.state,
      post_code: $scope.postCode,
      country: $scope.country,
      auth_token: $rootScope.auth_token
    };
    $scope.formSubmitted = true;
    return formData;
  };
  $scope.confirmCheckout = function() {
    riceService.checkout($scope.checkoutSubmit()).success(function() {
      $scope.formSubmitted = false;
      $state.go('thanks');
    });
  };
});
