import { v4 as uuid } from 'uuid';
import passwords from 'passwords';
import debugname from 'debug';
import { HTTPException } from 'hono/http-exception';
import models from '../../models/index.js';

const debug = debugname('hostr-api:user');

export async function get(c) {
  return c.json(c.get('user'));
}

export async function token(c) {
  const tok = uuid();
  await c.get('redis').set(tok, c.get('user').id, { EX: 86400 });
  return c.json({ token: tok });
}

export async function settings(c) {
  const body = await c.req.parseBody().catch(() => ({}));
  if (!body.current_password) {
    throw new HTTPException(400, { message: '{"error": {"message": "Current Password required to update account.", "code": 612}}' });
  }
  const user = await models.user.findByPk(c.get('user').id);
  if (!(await passwords.match(body.current_password, user.password))) {
    throw new HTTPException(400, { message: '{"error": {"message": "Incorrect password", "code": 606}}' });
  }
  if (body.email && body.email !== user.email) {
    user.email = body.email;
  }
  if (body.new_password) {
    if (body.new_password.length < 7) {
      throw new HTTPException(400, { message: '{"error": {"message": "Password must be 7 or more characters long.", "code": 606}}' });
    }
    user.password = await passwords.hash(body.new_password);
  }
  await user.save();
  return c.json({});
}

export async function deleteUser(c) {
  const body = await c.req.parseBody().catch(() => ({}));
  if (!body.current_password) {
    throw new HTTPException(400, { message: '{"error": {"message": "Current Password required to update account.", "code": 612}}' });
  }
  const user = await models.user.findByPk(c.get('user').id);
  if (!(await passwords.match(body.current_password, user.password))) {
    throw new HTTPException(400, { message: '{"error": {"message": "Incorrect password", "code": 606}}' });
  }
  await user.destroy();
  return c.json({ action: 'logout', message: 'Account deleted' });
}

