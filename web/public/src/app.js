import angular from 'angular';
import ngRoute from 'angular/route';
import ngResource from 'angular/resource';
import ReconnectingWebSocket from 'angular-reconnecting-websocket';
import ngDimensions from 'angular-strap/dist/modules/dimensions';
import ngTooltip from 'angular-strap/dist/modules/tooltip';

import { FilesController, FileController, AccountController, ProController, BillingController } from './app/controllers';
import { appHeader, appFooter, menuDropdown, searchShortcut, stripeSubscribe } from './app/directives';
import dropzone from './app/directives/dropzone';
import lazySrc from './app/directives/lazy-src';
import { fileSize, direct } from './app/filters';
import { FileService, UserService, EventService, TransactionService, SettingService } from './app/services';

// Declare app level module which depends on filters, and services
var app = angular.module('hostr', [
  'ngRoute',
  'ngResource',
  'reconnectingWebSocket',
  'mgcrea.ngStrap.tooltip'
]);

app.factory('FileService', ['$resource', '$cacheFactory', FileService.factory]);
app.factory('UserService', ['$resource', UserService.factory]);
app.factory('EventService', ['$rootScope', 'WebSocket', EventService.factory]);
app.factory('TransactionService', ['$resource', '$cacheFactory', TransactionService.factory]);
app.factory('SettingService', ['$http', SettingService.factory]);

app.filter('fileSize', [fileSize]);
app.filter('direct', [direct]);

app.directive('appHeader', [appHeader]);
app.directive('appFooter', [appFooter]);
app.directive('dropzone', ['FileService', '$cacheFactory', '$window', dropzone]);
app.directive('menuDropdown', [menuDropdown]);
app.directive('lazySrc', ['$window', '$document', lazySrc]);
app.directive('searchShortcut', ['$document', searchShortcut]);
app.directive('stripeSubscribe', ['$http', stripeSubscribe]);

app.config(['$routeProvider', '$locationProvider', '$httpProvider', '$tooltipProvider', function($routeProvider, $locationProvider, $httpProvider, $tooltipProvider) {
  $tooltipProvider.defaults.template = '/jspm_packages/npm/angular-strap@2.1.2/src/tooltip/tooltip.tpl.html';

  if (typeof window.user !== 'undefined') {
    $httpProvider.defaults.headers.common.Authorization = ':' + window.user.token;
  }
  $locationProvider.html5Mode(true);

  $httpProvider.interceptors.push(['$q', function($q) {
    return {
      responseError: function(rejection) {
        if (rejection.status === 401) {
          window.location = '/logout';
        }
        return $q.reject(rejection);
      }
    };
  }]);

  $routeProvider.when('/', {
    templateUrl: '/build/partials/files.html',
    controller: FilesController,
    title: ' - Files',
    resolve: {
      files: ['FileService', function(Files) {
        return Files.query();
      }]
    }
  })
  .when('/apps', {
    templateUrl: '/build/partials/apps.html',
    title: ' - Apps for Mac and Windows'
  })
  .when('/pro', {
    templateUrl: '/build/partials/pro.html',
    controller: ProController,
    title: ' - Pro'
  })
  .when('/account', {
    templateUrl: '/build/partials/account.html',
    controller: AccountController,
    title: ' - Account'
  })
  .when('/billing', {
    templateUrl: '/build/partials/billing.html',
    controller: BillingController,
    title: ' - Billing'
  })
  .when('/terms', {
    templateUrl: '/build/partials/terms.html',
    title: ' - Terms of Service'
  })
  .when('/privacy', {
    templateUrl: '/build/partials/privacy.html',
    title: ' - Privacy Policy'
  })
  .when('/:id', {
    templateUrl: '/build/partials/file.html',
    controller: FileController,
    resolve: {
      file: ['$route', 'FileService', function($route, Files) {
        return Files.get({id: $route.current.params.id});
      }]
    }
  });
}]);

app.run(['$location', '$rootScope', function($location, $rootScope) {

  $rootScope.$on('$routeChangeStart', function(e, curr) {
		if (curr.$$route && curr.$$route.resolve) {
			// Show a loading message until promises are resolved
			$rootScope.loadingView = true;
		}
	});
  $rootScope.$on('$routeChangeSuccess', function (event, current) {
    $rootScope.navError = false;
    $rootScope.pageTitle = current.$$route.title;
  });
  $rootScope.$on('$routeChangeError', function () {
    $rootScope.loadingView = false;
    $rootScope.navError = true;
  });
  $rootScope.$on('$locationChangeStart', function(event, newUrl) {
    if (window.ga) {
      window.ga('send', 'pageview', newUrl);
    }
  });
}]);
