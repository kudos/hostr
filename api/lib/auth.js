import passwords from 'passwords';
import auth from 'basic-auth';
import models from '../../models';
import debugname from 'debug';
const debug = debugname('hostr-api:auth');

const badLoginMsg = '{"error": {"message": "Incorrect login details.", "code": 607}}';

export default function* (next) {
  let user = false;
  const remoteIp = this.req.headers['x-real-ip'] || this.req.connection.remoteAddress;
  const login = yield models.login.create({
    ip: remoteIp,
    successful: false,
  });
  if (this.req.headers.authorization && this.req.headers.authorization[0] === ':') {
    debug('Logging in with token');
    const userToken = yield this.redis.get(this.req.headers.authorization.substr(1));
    this.assert(userToken, 401, '{"error": {"message": "Invalid token.", "code": 606}}');
    debug('Token found');
    user = yield models.user.findById(userToken);
    if (!user) {
      login.save();
      return;
    }
  } else {
    const authUser = auth(this);
    this.assert(authUser, 401, badLoginMsg);
    const count = yield models.login.count({
      where: {
        ip: remoteIp,
        successful: false,
        createdAt: {
          $gt: new Date(Date.now() - 600000),
        },
      },
    });

    this.assert(count < 25, 401,
      '{"error": {"message": "Too many incorrect logins.", "code": 608}}');

    user = yield models.user.findOne({
      where: {
        email: authUser.name,
        activated: true,
      },
    });

    if (!user || !(yield passwords.match(authUser.pass, user.password))) {
      login.save();
      this.throw(401, badLoginMsg);
      return;
    }
  }
  debug('Checking user');
  this.assert(user, 401, badLoginMsg);
  debug('Checking user is activated');
  debug(user.activated);
  this.assert(user.activated === true, 401,
    '{"error": {"message": "Account has not been activated.", "code": 603}}');

  login.successful = true;
  yield login.save();

  const uploadedTotal = yield models.file.count({
    where: {
      userId: user.id,
    },
  });
  const uploadedToday = yield models.file.count({
    where: {
      userId: user.id,
      createdAt: {
        $gt: Date.now() - 86400000,
      },
    },
  });

  const normalisedUser = {
    id: user.id,
    email: user.email,
    daily_upload_allowance: user.plan === 'Pro' ? 'unlimited' : 15,
    file_count: uploadedTotal,
    max_filesize: user.plan === 'Pro' ? 524288000 : 20971520,
    plan: user.plan,
    uploads_today: uploadedToday,
  };
  this.response.set('Daily-Uploads-Remaining',
    user.type === 'Pro' ? 'unlimited' : 15 - uploadedToday);
  this.user = normalisedUser;
  debug('Authenticated user: ', this.user.email);
  yield next;
}
