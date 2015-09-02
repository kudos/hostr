import passwords from 'passwords';
import auth from 'basic-auth';
import debugname from 'debug';
const debug = debugname('hostr-api:auth');

const badLoginMsg = '{"error": {"message": "Incorrect login details.", "code": 607}}';

export default function* (next) {
  const Users = this.db.Users;
  const Files = this.db.Files;
  const Logins = this.db.Logins;
  let user = false;

  if (this.req.headers.authorization && this.req.headers.authorization[0] === ':') {
    debug('Logging in with token');
    const userToken = yield this.redis.get(this.req.headers.authorization.substr(1));
    this.assert(userToken, 401, '{"error": {"message": "Invalid token.", "code": 606}}');
    debug('Token found');
    user = yield Users.findOne({'_id': this.db.objectID(userToken)});
  } else {
    const authUser = auth(this);
    this.assert(authUser, 401, badLoginMsg);
    const remoteIp = this.req.headers['x-real-ip'] || this.req.connection.remoteAddress;
    const count = yield Logins.count({ip: remoteIp, successful: false, at: { '$gt': Math.ceil(Date.now() / 1000) - 600}});
    this.assert(count < 25, 401, '{"error": {"message": "Too many incorrect logins.", "code": 608}}');

    yield Logins.insertOne({ip: remoteIp, at: Math.ceil(Date.now() / 1000), successful: null});
    user = yield Users.findOne({'email': authUser.name, 'banned': {'$exists': false}, 'status': {'$ne': 'deleted'}});
    this.assert(user, 401, badLoginMsg);
    const authenticated = yield passwords.match(authUser.pass, user.salted_password);
    this.assert(authenticated, 401, badLoginMsg);
  }
  debug('Checking user');
  this.assert(user, 401, badLoginMsg);
  debug('Checking user is activated');
  this.assert(!user.activationCode, 401, '{"error": {"message": "Account has not been activated.", "code": 603}}');

  const uploadedTotal = yield Files.count({owner: user._id, status: {'$ne': 'deleted'}});
  const uploadedToday = yield Files.count({owner: user._id, 'time_added': {'$gt': Math.ceil(Date.now() / 1000) - 86400}});

  const normalisedUser = {
    'id': user._id,
    'email': user.email,
    'daily_upload_allowance': user.type === 'Pro' ? 'unlimited' : 15,
    'file_count': uploadedTotal,
    'max_filesize': user.type === 'Pro' ? 524288000 : 20971520,
    'plan': user.type || 'Free',
    'uploads_today': uploadedToday,
  };
  this.response.set('Daily-Uploads-Remaining', user.type === 'Pro' ? 'unlimited' : 15 - uploadedToday);
  this.user = normalisedUser;
  debug('Authenticated user: ' + this.user.email);
  yield next;
}
