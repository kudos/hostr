import debugname from 'debug';
import { deleteCookie } from 'hono/cookie';
import { HTTPException } from 'hono/http-exception';
import {
  authenticate, setupSession, signup as signupUser, activateUser, sendResetToken,
  validateResetToken, updatePassword,
} from '../lib/auth.js';
import { render } from '../lib/render.js';
import models from '../../models/index.js';

const debug = debugname('hostr-web:user');

export async function signin(c) {
  const body = await c.req.parseBody().catch(() => ({}));
  if (!body.email) {
    return render(c, 'signin', { csrf: c.get('csrf'), async: true });
  }
  const user = await authenticate(c, body.email, body.password);
  if (!user || !user.id) {
    return render(c, 'signin', { error: 'Invalid login details', csrf: c.get('csrf'), async: true });
  } else if (user.activationCode) {
    return render(c, 'signin', {
      error: "Your account hasn't been activated yet. Check for an activation email.",
      csrf: c.get('csrf'),
      async: true,
    });
  }
  await setupSession(c, user);
  return c.redirect('/');
}

export async function signup(c) {
  return render(c, 'signup', { error: 'Signups are disabled.', csrf: c.get('csrf'), async: true });
}

export async function forgot(c) {
  const token = c.req.param('token');
  const body = await c.req.parseBody().catch(() => ({}));

  if (body.password) {
    if (body.password.length < 7) {
      return render(c, 'forgot', {
        error: 'Password needs to be at least 7 characters long.',
        csrf: c.get('csrf'),
        token,
        async: true,
      });
    }
    const resetUser = await validateResetToken(token);
    if (resetUser) {
      await updatePassword(resetUser.userId, body.password);
      const reset = await models.reset.findByPk(token);
      reset.destroy();
      await setupSession(c, resetUser);
      return c.redirect('/');
    }
  } else if (token) {
    const tokenUser = await validateResetToken(token);
    if (!tokenUser) {
      return render(c, 'forgot', {
        error: 'Invalid password reset token. It might be expired, or has already been used.',
        csrf: c.get('csrf'),
        token: null,
        async: true,
      });
    }
    return render(c, 'forgot', { csrf: c.get('csrf'), token, async: true });
  } else if (body.email) {
    try {
      await sendResetToken(body.email);
      return render(c, 'forgot', {
        message: "We've sent an email with a link to reset your password. Be sure to check your spam folder if it doesn't appear within a few minutes.",
        csrf: c.get('csrf'),
        token: null,
        async: true,
      });
    } catch (error) {
      debug(error);
    }
  }
  return render(c, 'forgot', { csrf: c.get('csrf'), token: null, async: true });
}

export async function logout(c) {
  deleteCookie(c, 'r', { path: '/' });
  c.set('session', {});
  return c.redirect('/');
}

export async function activate(c) {
  const { code } = c.req.param();
  if (await activateUser(c, code)) {
    return c.redirect('/');
  }
  throw new HTTPException(400);
}
