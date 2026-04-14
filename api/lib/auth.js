import passwords from 'passwords';
import debugname from 'debug';
import { Op } from 'sequelize';
import { HTTPException } from 'hono/http-exception';
import models from '../../models/index.js';

const debug = debugname('hostr-api:auth');

const badLoginMsg = '{"error": {"message": "Incorrect login details.", "code": 607}}';

export default async (c, next) => {
  let user = false;
  const remoteIp = c.req.header('x-forwarded-for')
    || c.env?.incoming?.socket?.remoteAddress
    || '0.0.0.0';

  const login = await models.login.create({
    ip: remoteIp.split(',')[0].trim(),
    successful: false,
  });

  const authHeader = c.req.header('authorization') || '';

  if (authHeader.startsWith(':')) {
    debug('Logging in with token');
    const userToken = await c.get('redis').get(authHeader.slice(1));
    if (!userToken) {
      login.save();
      throw new HTTPException(401, { message: '{"error": {"message": "Invalid token.", "code": 606}}' });
    }
    debug('Token found');
    user = await models.user.findByPk(userToken);
    if (!user) {
      login.save();
      return;
    }
  } else {
    let authUser = null;
    if (authHeader.startsWith('Basic ')) {
      const decoded = Buffer.from(authHeader.slice(6), 'base64').toString('utf-8');
      const colon = decoded.indexOf(':');
      if (colon > 0) authUser = { name: decoded.slice(0, colon), pass: decoded.slice(colon + 1) };
    }
    if (!authUser) throw new HTTPException(401, { message: badLoginMsg });

    const count = await models.login.count({
      where: {
        ip: remoteIp.split(',')[0].trim(),
        successful: false,
        createdAt: { [Op.gt]: new Date(Date.now() - 600000) },
      },
    });
    if (count >= 25) {
      throw new HTTPException(401, { message: '{"error": {"message": "Too many incorrect logins.", "code": 608}}' });
    }

    user = await models.user.findOne({ where: { email: authUser.name, activated: true } });
    if (!user || !(await passwords.match(authUser.pass, user.password))) {
      login.save();
      throw new HTTPException(401, { message: badLoginMsg });
    }
  }

  if (!user) throw new HTTPException(401, { message: badLoginMsg });
  if (user.activated !== true) {
    throw new HTTPException(401, { message: '{"error": {"message": "Account has not been activated.", "code": 603}}' });
  }

  login.successful = true;
  await login.save();

  const [uploadedTotal, uploadedToday] = await Promise.all([
    models.file.count({ where: { userId: user.id } }),
    models.file.count({ where: { userId: user.id, createdAt: { [Op.gt]: Date.now() - 86400000 } } }),
  ]);

  c.set('user', {
    id: user.id,
    email: user.email,
    daily_upload_allowance: 15,
    file_count: uploadedTotal,
    max_filesize: 20971520,
    uploads_today: uploadedToday,
  });
  c.header('Daily-Uploads-Remaining', String(15 - uploadedToday));
  debug('Authenticated user:', user.email);
  await next();
};
