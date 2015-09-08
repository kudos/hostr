import { connection } from './mongo';
import co from 'co';
import passwords from 'passwords';
import debuglog from 'debug';
const debug = debuglog('hostr:oauth-adapter');

const authorizedClientIds = ['hostr'];
export default class Model {
  constructor() {
    connection.then((conn) => {
      this.db = conn;
    });
  }

  generateToken(type, req, callback) {
    callback(false, null);
  }

  getAccessToken(bearerToken, callback) {
    debug('in getAccessToken (bearerToken: ' + bearerToken + ')');
    co(function* then() {
      try {
        const bearer = yield this.db.oauth_access_tokens.findOne({ accessToken: bearerToken });
        const user = yield this.db.Users.findOne({'_id': bearer.userId});

        const uploadedTotal = yield this.db.Files.count({owner: user._id, status: {'$ne': 'deleted'}});
        const uploadedToday = yield this.db.Files.count({owner: user._id, 'time_added': {'$gt': Math.ceil(Date.now() / 1000) - 86400}});

        const normalisedUser = {
          'id': user._id,
          'email': user.email,
          'daily_upload_allowance': user.type === 'Pro' ? 'unlimited' : 15,
          'file_count': uploadedTotal,
          'max_filesize': user.type === 'Pro' ? 524288000 : 20971520,
          'plan': user.type || 'Free',
          'uploads_today': uploadedToday,
        };

        callback(false, {
          expires: bearer.expires,
          user: normalisedUser,
        });
      } catch (e) {
        callback(e);
      }
    }.bind(this));
  }

  getClient(clientId, clientSecret, callback) {
    debug('in getClient (clientId: ' + clientId + ', clientSecret: ' + clientSecret + ')');
    if (clientSecret === null) {
      return this.db.oauth_clients.findOne({ clientId: clientId }, callback);
    }
    this.db.oauth_clients.findOne({ clientId: clientId, clientSecret: clientSecret }, callback);
  }

  // This will very much depend on your setup, I wouldn't advise doing anything exactly like this but
  // it gives an example of how to use the method to resrict certain grant types
  grantTypeAllowed(clientId, grantType, callback) {
    debug('in grantTypeAllowed (clientId: ' + clientId + ', grantType: ' + grantType + ')');

    if (grantType === 'password') {
      return callback(false, authorizedClientIds.indexOf(clientId) >= 0);
    }

    callback(false, true);
  }

  saveAccessToken(token, clientId, expires, userId, callback) {
    debug('in saveAccessToken (token: ' + token + ', clientId: ' + clientId + ', userId: ' + userId + ', expires: ' + expires + ')');

    const weekFromNow = new Date();
    weekFromNow.setDate(weekFromNow.getDate() + 7);

    const accessToken = {
      accessToken: token,
      clientId: clientId,
      userId: userId,
      expires: weekFromNow,
    };

    this.db.oauth_access_tokens.insertOne(accessToken, callback);
  }

  getUser(email, password, callback) {
    debug('in getUser (email: ' + email + ', password: ' + password + ')');
    co(function* then() {
      try {
        const user = yield this.db.Users.findOne({ email: email});
        if (yield passwords.match(password, user.salted_password)) {
          callback(null, user._id);
        } else {
          callback(false);
        }
      } catch(e) {
        throw e;
      }
    }.bind(this));
  }

  saveRefreshToken(token, clientId, expires, userId, callback) {
    debug('in saveRefreshToken (token: ' + token + ', clientId: ' + clientId + ', userId: ' + userId + ', expires: ' + expires + ')');
    const refreshToken = {
      refreshToken: token,
      clientId: clientId,
      userId: userId,
      expires: expires,
    };
    this.db.oauth_refresh_tokens.insertOne(refreshToken, callback);
  }

  getRefreshToken(refreshToken, callback) {
    debug('in getRefreshToken (refreshToken: ' + refreshToken + ')');
    this.db.oauth_refresh_tokens.findOne({ refreshToken: refreshToken }, callback);
  }
}
