import passwords from 'passwords';
import auth from 'basic-auth';
import models from '../../models';
import debugname from 'debug';
const debug = debugname('hostr-api:auth');

const badLoginMsg = '{"error": {"message": "Incorrect login details.", "code": 607}}';

export default async (ctx, next) => {
  let user = false;
  const remoteIp = ctx.req.headers['x-forwarded-for'] || ctx.req.connection.remoteAddress;
  const login = await models.login.create({
    ip: remoteIp,
    successful: false,
  });
  if (ctx.req.headers.authorization && ctx.req.headers.authorization[0] === ':') {
    debug('Logging in with token');
    const userToken = await ctx.redis.get(ctx.req.headers.authorization.substr(1));
    ctx.assert(userToken, 401, '{"error": {"message": "Invalid token.", "code": 606}}');
    debug('Token found');
    user = await models.user.findById(userToken);
    if (!user) {
      login.save();
      return;
    }
  } else {
    const authUser = auth(ctx);
    ctx.assert(authUser, 401, badLoginMsg);
    const count = await models.login.count({
      where: {
        ip: remoteIp,
        successful: false,
        createdAt: {
          $gt: new Date(Date.now() - 600000),
        },
      },
    });

    ctx.assert(count < 25, 401,
      '{"error": {"message": "Too many incorrect logins.", "code": 608}}');

    user = await models.user.findOne({
      where: {
        email: authUser.name,
        activated: true,
      },
    });

    if (!user || !(await passwords.match(authUser.pass, user.password))) {
      login.save();
      ctx.throw(401, badLoginMsg);
      return;
    }
  }
  debug('Checking user');
  ctx.assert(user, 401, badLoginMsg);
  debug('Checking user is activated');
  debug(user.activated);
  ctx.assert(user.activated === true, 401,
    '{"error": {"message": "Account has not been activated.", "code": 603}}');

  login.successful = true;
  await login.save();

  const uploadedTotal = await models.file.count({
    where: {
      userId: user.id,
    },
  });
  const uploadedToday = await models.file.count({
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
  ctx.response.set('Daily-Uploads-Remaining',
    user.type === 'Pro' ? 'unlimited' : 15 - uploadedToday);
  ctx.user = normalisedUser;
  debug('Authenticated user: ', ctx.user.email);
  await next();
}
