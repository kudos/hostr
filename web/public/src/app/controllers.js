export class FilesController {
  constructor($scope, UserService, EventService, files) {
    $scope.$root.user = UserService.get();
    files.$promise.then(function() {
      $scope.$root.loadingView = false;
    });
    $scope.header = 'full';
    if (!$scope.$root.files) {
      $scope.$root.files = files;
    }
    $scope.remove = function(file) {
      $scope.$root.files.some(function(existingFile, index) {
        if (file.id === existingFile.id) {
          file.$remove(function() {
            $scope.$root.showDropdown = false;
            $scope.$root.files.splice(index, 1);
          });
          return true;
        }
        return false;
      });
    };
  }
}
FilesController.$inject = ['$scope', 'UserService', 'EventService', 'files'];

export class FileController {
  constructor ($scope, $rootScope, $routeParams, ReconnectingWebSocket, file) {
    file.$promise.then(function() {
      $scope.$root.loadingView = false;
      $scope.header = 'small';
      $scope.file = file;
      $scope.direct = '/file/' + file.id + '/' + file.name;
      $rootScope.pageTitle = ' - ' + file.name;
      if (file.status === 'uploading') {
        file.percent = 0;
        var ws = new ReconnectingWebSocket(window.settings.apiURL.replace(/^http/, 'ws') + '/file/' + file.id);
        ws.onmessage = function (msg) {
          var evt = JSON.parse(msg.data);
          $rootScope.$broadcast(evt.type, evt.data);
        };
        ws.onopen = function() {
          ws.send(JSON.stringify({authorization: window.user.token}));
        };
        $rootScope.$on('file-progress', function(evt, data) {
          $scope.file.percent = data.complete;
        });
        $rootScope.$on('file-added', function(evt, data) {
          $scope.file = data;
        });
        $rootScope.$on('file-accepted', function(evt, data) {
          $scope.file = data;
        });
      }
    }, function() {
      $rootScope.navError = true;
      $scope.$root.loadingView = false;
    });
  }
}
FileController.$inject = ['$scope', '$rootScope', '$routeParams', 'WebSocket',  'file'];

export class ProController {
  constructor ($scope, $http, UserService) {
    $scope.$root.loadingView = false;
    $scope.user = UserService.get();
    $scope.header = 'full';
    $scope.cancel = function() {
      $http.post('/pro/cancel').success(function() {
        window.location.reload(true);
      }).error(function(data) {
        console.log(new Error(data));
      });
    };
  }
}
ProController.$inject = ['$scope', '$http', 'UserService'];

export class AccountController {
  constructor ($scope, UserService, SettingService) {
    $scope.$root.loadingView = false;
    $scope.$root.user = UserService.get();
    $scope.submit = function(form) {
      $scope.updated = false;
      $scope.error = false;
      SettingService.update(form).then(function() {
        $scope.updated = true;
        delete $scope.user.new_password;
        delete $scope.user.current_password;
      }, function(response) {
        $scope.error = response.data.error.message;
      });
    };
  }
}
AccountController.$inject = ['$scope', 'UserService', 'SettingService'];

export class BillingController {
  constructor ($scope, UserService, TransactionService) {
    $scope.$root.loadingView = false;
    $scope.$root.user = UserService.get();
    $scope.transactions = TransactionService.query();
  }
}
BillingController.$inject = ['$scope', 'UserService', 'TransactionService'];
