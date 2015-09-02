System.register([], function (_export) {
  'use strict';

  var FileService, UserService, EventService, TransactionService, SettingService;

  var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

  function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

  return {
    setters: [],
    execute: function () {
      FileService = (function () {
        function FileService($resource, $cacheFactory) {
          _classCallCheck(this, FileService);

          var cache = $cacheFactory('files-cache');
          return $resource(window.settings.apiURL + '/file/:id', {
            id: '@id'
          }, {
            query: {
              method: 'GET',
              isArray: true,
              cache: cache,
              params: {
                perpage: 0,
                all: true
              }
            },
            'delete': {
              method: 'DELETE',
              isArray: true,
              cache: cache
            }
          });
        }

        _createClass(FileService, null, [{
          key: 'factory',
          value: function factory($resource, $cacheFactory) {
            return new FileService($resource, $cacheFactory);
          }
        }]);

        return FileService;
      })();

      _export('FileService', FileService);

      UserService = (function () {
        function UserService($resource) {
          _classCallCheck(this, UserService);

          return $resource(window.settings.apiURL + '/user');
        }

        _createClass(UserService, null, [{
          key: 'factory',
          value: function factory($resource) {
            return new UserService($resource);
          }
        }]);

        return UserService;
      })();

      _export('UserService', UserService);

      EventService = (function () {
        function EventService($rootScope, ReconnectingWebSocket) {
          _classCallCheck(this, EventService);

          if (window.user && WebSocket) {
            (function () {
              var ws = new ReconnectingWebSocket('wss' + window.settings.apiURL.replace('https', '').replace('http', '') + '/user');
              ws.onmessage = function (msg) {
                var evt = JSON.parse(msg.data);
                $rootScope.$broadcast(evt.type, evt.data);
              };
              ws.onopen = function () {
                ws.send(JSON.stringify({
                  authorization: window.user.token
                }));
              };
            })();
          }
          return true;
        }

        _createClass(EventService, null, [{
          key: 'factory',
          value: function factory($rootScope, ReconnectingWebSocket) {
            return new EventService($rootScope, ReconnectingWebSocket);
          }
        }]);

        return EventService;
      })();

      _export('EventService', EventService);

      TransactionService = (function () {
        function TransactionService($resource, $cacheFactory) {
          _classCallCheck(this, TransactionService);

          var cache = $cacheFactory('transaction-cache');
          return $resource(window.settings.apiURL + '/user/transaction/:id', {
            id: '@id'
          }, {
            query: {
              method: 'GET',
              isArray: true,
              cache: cache
            }
          });
        }

        _createClass(TransactionService, null, [{
          key: 'factory',
          value: function factory($resource, $cacheFactory) {
            return new TransactionService($resource, $cacheFactory);
          }
        }]);

        return TransactionService;
      })();

      _export('TransactionService', TransactionService);

      SettingService = (function () {
        function SettingService($http) {
          _classCallCheck(this, SettingService);

          var service = {};
          service.update = function (data) {
            return $http.post(window.settings.apiURL + '/user/settings', data);
          };
          return service;
        }

        _createClass(SettingService, null, [{
          key: 'factory',
          value: function factory($http) {
            return new SettingService($http);
          }
        }]);

        return SettingService;
      })();

      _export('SettingService', SettingService);
    }
  };
});