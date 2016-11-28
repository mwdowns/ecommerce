var app = angular.module('store', ['ui.router', 'ngCookies']);

// This is the State controller section for the site. It controls the views that a user will see by loading page templates and designating which controllers run those views.
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

// This is my API. It has all the various services I can use throughout my app. I use the shorthand notation for the services if they are post or get without parameters. If it is a get method that has parameters, I used the long form. I also take care of setting rootScope variables for handling the authorization tokens needed for cookies.
app.factory('riceService', function($http, $cookies, $rootScope, $state) {
  var service = {};
  // These are the checks for tokens and such in order to handle authentication of the user. The loggedIn variable in the first if statement will affect what the user can see and do on the site. Once cookies are detected, rootScope varables are set for the user_name, and auth_token.
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
  // Single logout handler that reinitiallizes the rootScope variables.
  $rootScope.logout = function() {
    $cookies.remove('cookie_data');
    $rootScope.user_name = 'Guest';
    $rootScope.auth_token = null;
    $rootScope.loggedIn = false;
    $state.go('home');
  };

  service.getProducts = function() {
    return $http.get(
      '/api/products'
    );
  };

  service.getDetails = function(id) {
    var url = '/api/product/' + id;
    return $http.get(
      url
    );
  };

  service.signup = function(formData) {
    return $http.post(
      '/api/user/signup',
      formData
    );
  };

  service.login = function(formData) {
    return $http.post(
      '/api/user/login',
      formData
    ).success(function(login_data) {
      $cookies.putObject('cookie_data', login_data);
      $rootScope.user_name = login_data.user_name;
      $rootScope.auth_token = login_data.token;
    });
  };

  service.addToCart = function(addToCartData) {
    return $http.post(
      '/api/shopping_cart',
      addToCartData
    );
  };

  service.viewCart = function() {
    var url = '/api/shopping_cart';
    return $http({
      method: 'GET',
      url: '/api/shopping_cart',
      params: {
        auth_token: $rootScope.auth_token
      }
    });
  };

  service.checkout = function(formData) {
    return $http.post(
      '/api/shopping_cart/checkout',
      formData
    );
  };

  return service;
});


// This is my section for the various app controllers.
app.controller("MainController", function($scope, riceService, $stateParams, $state) {
  riceService.getProducts()
    .success(function(results) {
      $scope.results = results;
      $scope.getItemId = function(item) {
        $scope.id = item.id;
      };
    })
    .error(function() {
      console.log('our inventory has been depleted. sorry');
    });
});

app.controller("DetailsController", function($scope, riceService, $stateParams, $state, $cookies, $rootScope) {
  $scope.id = $stateParams.product_id;
  riceService.getDetails($scope.id)
    .success(function(item) {
      $scope.name = item.name;
      $scope.description = item.description;
      $scope.image = item.image_path;
    })
    .error(function() {
      console.log('sorry, i could not find what you are looking for');
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
      riceService.signup(formData)
        .success(function() {
          if ($cookies.getObject('location')) {
            var cookie = $cookies.getObject('location');
            console.log(cookie);
            $state.go('product_details', {product_id: Number(cookie.product_id)});
          }
          else {
            $state.go('login');
          }
        })
        .error(function() {
          console.log('could not sign up');
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
        console.log('login failed');
        $scope.wronglogin = true;
      })
      .success(function() {
        if ($cookies.getObject('location')) {
          var cookie = $cookies.getObject('location');
          $rootScope.loggedIn = true;
          $state.go('product_details', {product_id: Number(cookie.product_id)});
          $cookies.remove('location');
        }
        else if ($cookies.getObject('cookie_data')) {
          $state.go('home');
          $rootScope.loggedIn = true;
        }
        else {
          $state.go('login');
        }
      });
  };
});

app.controller("CartController", function($scope, riceService, $stateParams, $state, $cookies, $rootScope) {
  riceService.viewCart()
    .success(function(resultsArr) {
      $scope.results = resultsArr;
      $scope.cart = resultsArr.product_query;
      $scope.total = resultsArr.total_price;
    })
    .error(function() {
      console.log('could not complete transaction');
    });
});

app.controller("CheckoutController", function($scope, riceService, $stateParams, $state, $cookies, $rootScope) {
  // This packages up all the needed info to send to the backend upon a successful transaction.
  $scope.checkoutSubmit = function(token) {
    var formData = {
      street_address: $scope.streetAddress,
      city: $scope.city,
      state: $scope.state,
      post_code: $scope.postCode,
      country: $scope.country,
      auth_token: $rootScope.auth_token,
      stripe_token: token
    };
    $scope.formSubmitted = true;
    return formData;
  };
  // This retrieves the price from the cart, and sets the total for the Stripe functions to the site-total multiplied by 100.
  riceService.viewCart().success(function(cart) {
    $scope.total = cart.total_price;
    $scope.stripeTotal = cart.total_price * 100;
  });
  // This is the stripe handler which uses the Stripe service for payment. It uses my personal, public stripe in order to open (line 280) the Stripe service. Also, on callback of that service it runs the checkout method.
  $scope.stripeHandler = StripeCheckout.configure(
    {
    key: 'pk_test_HCW7XEDQe9gJIfUtWAGdqbFt',
    locale: 'auto',
    token: function callback(token) {
      var stripeToken = token.id;
      riceService.checkout($scope.checkoutSubmit(stripeToken))
        .success(function() {
          $scope.formSubmitted = false;
          $state.go('thanks');
        })
        .error(function() {
          console.log('something went wrong');
        });
    }
  });
  // This is the final call for checking out. It opens the Stripe popup that will take care of the credit card charge. Once successful, the callback StripeHandler runs the checkout method which runs the checkoutSubmit as well, which adds info to the purchase and products_in_purchase tables and deletes the items from the products_in_shopping_cart table.
  $scope.confirmCheckout = function() {
    $scope.stripeHandler.open({
      name: $rootScope.user_name,
      description: 'Rice SuperStore Checkout',
      amount: $scope.stripeTotal
    });


  };
});
