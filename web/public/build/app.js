System.register(['angular', 'angular/route', 'angular/resource', 'angular-reconnecting-websocket', 'angular-strap/dist/modules/dimensions', 'angular-strap/dist/modules/compiler', 'angular-strap/dist/modules/tooltip', 'angular-strap/dist/modules/tooltip.tpl', './app/controllers', './app/directives', './app/directives/dropzone', './app/directives/lazy-src', './app/filters', './app/services'], function (_export) {

  // Declare app level module which depends on filters, and services
  'use strict';

  var angular, FilesController, FileController, AccountController, ProController, BillingController, appHeader, appFooter, menuDropdown, searchShortcut, stripeSubscribe, dropzone, lazySrc, fileSize, direct, FileService, UserService, EventService, TransactionService, SettingService, app;
  return {
    setters: [function (_angular) {
      angular = _angular['default'];
    }, function (_angularRoute) {}, function (_angularResource) {}, function (_angularReconnectingWebsocket) {}, function (_angularStrapDistModulesDimensions) {}, function (_angularStrapDistModulesCompiler) {}, function (_angularStrapDistModulesTooltip) {}, function (_angularStrapDistModulesTooltipTpl) {}, function (_appControllers) {
      FilesController = _appControllers.FilesController;
      FileController = _appControllers.FileController;
      AccountController = _appControllers.AccountController;
      ProController = _appControllers.ProController;
      BillingController = _appControllers.BillingController;
    }, function (_appDirectives) {
      appHeader = _appDirectives.appHeader;
      appFooter = _appDirectives.appFooter;
      menuDropdown = _appDirectives.menuDropdown;
      searchShortcut = _appDirectives.searchShortcut;
      stripeSubscribe = _appDirectives.stripeSubscribe;
    }, function (_appDirectivesDropzone) {
      dropzone = _appDirectivesDropzone['default'];
    }, function (_appDirectivesLazySrc) {
      lazySrc = _appDirectivesLazySrc['default'];
    }, function (_appFilters) {
      fileSize = _appFilters.fileSize;
      direct = _appFilters.direct;
    }, function (_appServices) {
      FileService = _appServices.FileService;
      UserService = _appServices.UserService;
      EventService = _appServices.EventService;
      TransactionService = _appServices.TransactionService;
      SettingService = _appServices.SettingService;
    }],
    execute: function () {
      app = angular.module('hostr', ['ngRoute', 'ngResource', 'reconnectingWebSocket', 'mgcrea.ngStrap.core', 'mgcrea.ngStrap.tooltip']);

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

      app.config(['$routeProvider', '$locationProvider', '$httpProvider', function ($routeProvider, $locationProvider, $httpProvider) {
        if (typeof window.user !== 'undefined') {
          $httpProvider.defaults.headers.common.Authorization = ':' + window.user.token;
        }
        $locationProvider.html5Mode(true);

        $httpProvider.interceptors.push(['$q', function ($q) {
          return {
            responseError: function responseError(rejection) {
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
            files: ['FileService', function (Files) {
              return Files.query();
            }]
          }
        }).when('/apps', {
          templateUrl: '/build/partials/apps.html',
          title: ' - Apps for Mac and Windows'
        }).when('/pro', {
          templateUrl: '/build/partials/pro.html',
          controller: ProController,
          title: ' - Pro'
        }).when('/account', {
          templateUrl: '/build/partials/account.html',
          controller: AccountController,
          title: ' - Account'
        }).when('/billing', {
          templateUrl: '/build/partials/billing.html',
          controller: BillingController,
          title: ' - Billing'
        }).when('/terms', {
          templateUrl: '/build/partials/terms.html',
          title: ' - Terms of Service'
        }).when('/privacy', {
          templateUrl: '/build/partials/privacy.html',
          title: ' - Privacy Policy'
        }).when('/:id', {
          templateUrl: '/build/partials/file.html',
          controller: FileController,
          resolve: {
            file: ['$route', 'FileService', function ($route, Files) {
              return Files.get({ id: $route.current.params.id });
            }]
          }
        });
      }]);

      app.run(['$location', '$rootScope', function ($location, $rootScope) {
        $rootScope.$on('$routeChangeStart', function (e, curr) {
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
        $rootScope.$on('$locationChangeStart', function (event, newUrl) {
          if (window.ga) {
            window.ga('send', 'pageview', newUrl);
          }
        });
      }]);
    }
  };
});