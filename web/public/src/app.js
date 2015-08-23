import angular from 'angular';
import 'angular/route';
import 'angular/resource';
import 'angular-reconnecting-websocket';
import 'angular-strap/dist/modules/dimensions';
import 'angular-strap/dist/modules/compiler';
import 'angular-strap/dist/modules/tooltip';
import 'angular-strap/dist/modules/tooltip.tpl';

import { FilesController, FileController, AccountController, ProController, BillingController } from './app/controllers';
import { appHeader, appFooter, menuDropdown, searchShortcut, stripeSubscribe } from './app/directives';
import dropzone from './app/directives/dropzone';
import lazySrc from './app/directives/lazy-src';
import { fileSize, direct } from './app/filters';
import { FileService, UserService, EventService, TransactionService, SettingService } from './app/services';

// Declare app level module which depends on filters, and services
const app = angular.module('hostr', [
  'ngRoute',
  'ngResource',
  'reconnectingWebSocket',
  'mgcrea.ngStrap.core',
  'mgcrea.ngStrap.tooltip',
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

app.config(['$routeProvider', '$locationProvider', '$httpProvider', ($routeProvider, $locationProvider, $httpProvider) => {
  if (typeof window.user !== 'undefined') {
    $httpProvider.defaults.headers.common.Authorization = ':' + window.user.token;
  }
  $locationProvider.html5Mode(true);

  $httpProvider.interceptors.push(['$q', ($q) => {
    return {
      responseError: (rejection) => {
        if (rejection.status === 401) {
          window.location = '/logout';
        }
        return $q.reject(rejection);
      },
    };
  }]);

  $routeProvider.when('/', {
    templateUrl: '/build/partials/files.html',
    controller: FilesController,
    title: ' - Files',
    resolve: {
      files: ['FileService', (Files) => {
        return Files.query();
      }],
    },
  })
  .when('/apps', {
    templateUrl: '/build/partials/apps.html',
    title: ' - Apps for Mac and Windows',
  })
  .when('/pro', {
    templateUrl: '/build/partials/pro.html',
    controller: ProController,
    title: ' - Pro',
  })
  .when('/account', {
    templateUrl: '/build/partials/account.html',
    controller: AccountController,
    title: ' - Account',
  })
  .when('/billing', {
    templateUrl: '/build/partials/billing.html',
    controller: BillingController,
    title: ' - Billing',
  })
  .when('/terms', {
    templateUrl: '/build/partials/terms.html',
    title: ' - Terms of Service',
  })
  .when('/privacy', {
    templateUrl: '/build/partials/privacy.html',
    title: ' - Privacy Policy',
  })
  .when('/:id', {
    templateUrl: '/build/partials/file.html',
    controller: FileController,
    resolve: {
      file: ['$route', 'FileService', ($route, Files) => {
        return Files.get({id: $route.current.params.id});
      }],
    },
  });
}]);

app.run(['$location', '$rootScope', ($location, $rootScope) => {
  $rootScope.$on('$routeChangeStart', (e, curr) => {
    if (curr.$$route && curr.$$route.resolve) {
			// Show a loading message until promises are resolved
      $rootScope.loadingView = true;
    }
  });
  $rootScope.$on('$routeChangeSuccess', (event, current) => {
    $rootScope.navError = false;
    $rootScope.pageTitle = current.$$route.title;
  });
  $rootScope.$on('$routeChangeError', () => {
    $rootScope.loadingView = false;
    $rootScope.navError = true;
  });
  $rootScope.$on('$locationChangeStart', (event, newUrl) => {
    if (window.ga) {
      window.ga('send', 'pageview', newUrl);
    }
  });
}]);
