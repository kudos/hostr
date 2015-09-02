System.register(['jquery'], function (_export) {
  'use strict';

  var $;

  _export('appHeader', appHeader);

  _export('appFooter', appFooter);

  _export('menuDropdown', menuDropdown);

  _export('searchShortcut', searchShortcut);

  // angular.module('hostr').directive('clippy', ['files', function factory() {
  //   return function(scope, element, attrs) {
  //     element = element[0];
  //     var client = new ZeroClipboard(element);
  //     client.on('ready', function(readyEvent) {
  //       element.addEventListener('click', function(event) {
  //         event.preventDefault();
  //       });
  //
  //       client.on( 'aftercopy', function( event ) {
  //         if (element.innerHTML == 'Copy Link') {
  //           element.innerHTML = 'Copied!';
  //           setTimeout(function() {
  //             if (element) {
  //               element.innerHTML = 'Copy Link';
  //             }
  //           }, 1500);
  //         }
  //       });
  //     });
  //   }
  // }]);

  _export('stripeSubscribe', stripeSubscribe);

  function appHeader() {
    return {
      restrict: 'E',
      templateUrl: '/build/partials/header.html',
      replace: true,
      link: function postLink(scope) {
        scope.userMD5 = window.user.md5;
        scope.email = window.user.email;
        scope.pro = window.user.type === 'Pro';
      }
    };
  }

  function appFooter() {
    return {
      restrict: 'E',
      templateUrl: '/build/partials/footer.html',
      replace: true,
      link: function postLink(scope) {
        scope.userMD5 = window.user.md5;
        scope.email = window.user.email;
        scope.pro = window.user.type === 'Pro';
      }
    };
  }

  function menuDropdown() {
    return function ($scope, element) {
      $scope.$root.overlayClick = function overlayClick() {
        $scope.$root.showDropdown = false;
        $('.dropdown').hide();
      };
      var activeDropdown = $(element).find('.dropdown');
      element.on('click', function (e) {
        if (activeDropdown.not(':visible').length > 0) {
          $('.dropdown').hide();
          $scope.$root.showDropdown = true;
          activeDropdown.show();
        } else if (e.target === element.find('img')[0]) {
          $scope.$root.showDropdown = false;
          activeDropdown.hide();
        }
        $scope.$apply();
      });
    };
  }

  function searchShortcut($document) {
    return function ($scope, element) {
      $document.bind('keypress', function (event) {
        if (event.which === 47) {
          if (['INPUT', 'TEXTAREA'].indexOf(document.activeElement.tagName) < 0) {
            element[0].focus();
            event.preventDefault();
          }
        }
      });
    };
  }

  function stripeSubscribe($http) {
    var handler = window.StripeCheckout.configure({
      key: window.settings.stripePublic,
      image: '/images/stripe-128.png',
      token: function token(_token) {
        $http.post('/pro/create', {
          stripeToken: _token
        }).success(function (data) {
          if (data.status === 'active') {
            window.user.plan = 'Pro';
            window.location.reload(true);
          }
        }).error(function () {
          console.error('Error upgrading your account');
        });
      }
    });
    return function (scope, element) {
      element.on('click', function () {
        // Open Checkout with further options
        handler.open({
          name: 'Hostr',
          email: window.user.email,
          description: 'Hostr Pro Monthly',
          amount: 600,
          currency: 'USD',
          panelLabel: 'Subscribe {{amount}}',
          billingAddress: false
        });
      });
    };
  }

  return {
    setters: [function (_jquery) {
      $ = _jquery['default'];
    }],
    execute: function () {}
  };
});