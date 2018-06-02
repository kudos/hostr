export class FileService {
  constructor($resource, $cacheFactory) {
    const cache = $cacheFactory('files-cache');
    return $resource(window.settings.apiURL + '/file/:id', {
      id: '@id',
    }, {
      query: {
        method: 'GET',
        isArray: true,
        cache: cache,
        params: {
          perpage: 0,
          all: true,
        },
      },
      delete: {
        method: 'DELETE',
        isArray: true,
        cache: cache,
      },
    });
  }

  static factory($resource, $cacheFactory) {
    return new FileService($resource, $cacheFactory);
  }
}

export class UserService {
  constructor($resource) {
    return $resource(window.settings.apiURL + '/user');
  }

  static factory($resource) {
    return new UserService($resource);
  }
}

export class EventService {
  constructor($rootScope, ReconnectingWebSocket) {
    if (window.user && WebSocket) {
      const apiURL = new URL(window.settings.apiURL);
      const ws = new ReconnectingWebSocket((apiURL.protocol === 'http:' ? 'ws' : 'wss') + window.settings.apiURL.replace('https', '').replace('http', '') + '/user');
      ws.onmessage = (msg) => {
        const evt = JSON.parse(msg.data);
        $rootScope.$broadcast(evt.type, evt.data);
      };
      ws.onopen = () => {
        ws.send(JSON.stringify({
          authorization: window.user.token,
        }));
      };
    }
    return true;
  }

  static factory($rootScope, ReconnectingWebSocket) {
    return new EventService($rootScope, ReconnectingWebSocket);
  }
}

export class TransactionService {
  constructor($resource, $cacheFactory) {
    const cache = $cacheFactory('transaction-cache');
    return $resource(window.settings.apiURL + '/user/transaction/:id', {
      id: '@id',
    }, {
      query: {
        method: 'GET',
        isArray: true,
        cache: cache,
      },
    });
  }

  static factory($resource, $cacheFactory) {
    return new TransactionService($resource, $cacheFactory);
  }
}

export class SettingService {
  constructor($http) {
    const service = {};
    service.update = (data) => {
      return $http.post(window.settings.apiURL + '/user/settings', data);
    };
    return service;
  }

  static factory($http) {
    return new SettingService($http);
  }
}
