System.register([], function (_export) {
  'use strict';

  var FilesController, FileController, ProController, AccountController, BillingController;

  function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

  return {
    setters: [],
    execute: function () {
      FilesController = function FilesController($scope, UserService, EventService, files) {
        _classCallCheck(this, FilesController);

        $scope.$root.user = UserService.get();
        files.$promise.then(function () {
          $scope.$root.loadingView = false;
        });
        $scope.header = 'full';
        if (!$scope.$root.files) {
          $scope.$root.files = files;
        }
        $scope.remove = function (file) {
          $scope.$root.files.some(function (existingFile, index) {
            if (file.id === existingFile.id) {
              file.$remove(function () {
                $scope.$root.showDropdown = false;
                $scope.$root.files.splice(index, 1);
              });
              return true;
            }
            return false;
          });
        };
      };

      _export('FilesController', FilesController);

      FilesController.$inject = ['$scope', 'UserService', 'EventService', 'files'];

      FileController = function FileController($scope, $rootScope, $routeParams, ReconnectingWebSocket, file) {
        _classCallCheck(this, FileController);

        file.$promise.then(function () {
          $scope.$root.loadingView = false;
          $scope.header = 'small';
          $scope.file = file;
          $scope.direct = '/file/' + file.id + '/' + file.name;
          $rootScope.pageTitle = ' - ' + file.name;
          if (file.status === 'uploading') {
            (function () {
              file.percent = 0;
              var ws = new ReconnectingWebSocket(window.settings.apiURL.replace(/^http/, 'ws') + '/file/' + file.id);
              ws.onmessage = function (msg) {
                var evt = JSON.parse(msg.data);
                $rootScope.$broadcast(evt.type, evt.data);
              };
              ws.onopen = function () {
                ws.send(JSON.stringify({ authorization: window.user.token }));
              };
              $rootScope.$on('file-progress', function (evt, data) {
                $scope.file.percent = data.complete;
              });
              $rootScope.$on('file-added', function (evt, data) {
                $scope.file = data;
              });
              $rootScope.$on('file-accepted', function (evt, data) {
                $scope.file = data;
              });
            })();
          }
        }, function () {
          $rootScope.navError = true;
          $scope.$root.loadingView = false;
        });
      };

      _export('FileController', FileController);

      FileController.$inject = ['$scope', '$rootScope', '$routeParams', 'WebSocket', 'file'];

      ProController = function ProController($scope, $http, UserService) {
        _classCallCheck(this, ProController);

        $scope.$root.loadingView = false;
        $scope.user = UserService.get();
        $scope.header = 'full';
        $scope.cancel = function () {
          $http.post('/pro/cancel').success(function () {
            window.location.reload(true);
          }).error(function (data) {
            console.error(new Error(data));
          });
        };
      };

      _export('ProController', ProController);

      ProController.$inject = ['$scope', '$http', 'UserService'];

      AccountController = function AccountController($scope, UserService, SettingService) {
        _classCallCheck(this, AccountController);

        $scope.$root.loadingView = false;
        $scope.$root.user = UserService.get();
        $scope.submit = function (form) {
          $scope.updated = false;
          $scope.error = false;
          SettingService.update(form).then(function () {
            $scope.updated = true;
            delete $scope.user.new_password;
            delete $scope.user.current_password;
          }, function (response) {
            $scope.error = response.data.error.message;
          });
        };
      };

      _export('AccountController', AccountController);

      AccountController.$inject = ['$scope', 'UserService', 'SettingService'];

      BillingController = function BillingController($scope, UserService, TransactionService) {
        _classCallCheck(this, BillingController);

        $scope.$root.loadingView = false;
        $scope.$root.user = UserService.get();
        $scope.transactions = TransactionService.query();
      };

      _export('BillingController', BillingController);

      BillingController.$inject = ['$scope', 'UserService', 'TransactionService'];
    }
  };
});