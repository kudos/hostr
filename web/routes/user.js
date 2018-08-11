import debugname from 'debug';
import {
  authenticate, setupSession, signup as signupUser, activateUser, sendResetToken,
  validateResetToken, updatePassword,
} from '../lib/auth';

import models from '../../models';

const debug = debugname('hostr-web:user');

export async function signin(ctx) {
  if (!ctx.request.body.email) {
    await ctx.render('signin', { csrf: ctx.csrf });
    return;
  }

  ctx.statsd.incr('auth.attempt', 1);

  const user = await authenticate.call(ctx, ctx.request.body.email, ctx.request.body.password);

  if (!user) {
    ctx.statsd.incr('auth.failure', 1);
    await ctx.render('signin', { error: 'Invalid login details', csrf: ctx.csrf });
    return;
  } else if (user.activationCode) {
    await ctx.render('signin', {
      error: 'Your account hasn\'t been activated yet. Check for an activation email.',
      csrf: ctx.csrf,
    });
    return;
  }
  ctx.statsd.incr('auth.success', 1);
  await setupSession.call(ctx, user);
  ctx.redirect('/');
}


export async function signup(ctx) {
  if (!ctx.request.body.email) {
    await ctx.render('signup', { csrf: ctx.csrf });
    return;
  }

  if (ctx.request.body.email !== ctx.request.body.confirm_email) {
    await ctx.render('signup', { error: 'Emails do not match.', csrf: ctx.csrf });
    return;
  } else if (ctx.request.body.email && !ctx.request.body.terms) {
    await ctx.render('signup', {
      error: 'You must agree to the terms of service.',
      csrf: ctx.csrf,
    });
    return;
  } else if (ctx.request.body.password && ctx.request.body.password.length < 7) {
    await ctx.render('signup', {
      error: 'Password must be at least 7 characters long.',
      csrf: ctx.csrf,
    });
    return;
  }
  const ip = ctx.headers['x-forwarded-for'] || ctx.ip;
  const { email, password } = ctx.request.body;
  try {
    await signupUser.call(ctx, email, password, ip);
  } catch (e) {
    await ctx.render('signup', { error: e.message, csrf: ctx.csrf });
    return;
  }
  ctx.statsd.incr('auth.signup', 1);
  await ctx.render('signup', {
    message: 'Thanks for signing up, we\'ve sent you an email to activate your account.',
    csrf: ctx.csrf,
  });
}


export async function forgot(ctx) {
  const { token } = ctx.params;

  if (ctx.request.body.password) {
    if (ctx.request.body.password.length < 7) {
      await ctx.render('forgot', {
        error: 'Password needs to be at least 7 characters long.',
        csrf: ctx.csrf,
        token,
      });
      return;
    }

    const user = await validateResetToken(token);
    if (user) {
      await updatePassword(user.userId, ctx.request.body.password);
      const reset = await models.reset.findById(token);
      reset.destroy();
      await setupSession.call(ctx, user);
      ctx.statsd.incr('auth.reset.success', 1);
      ctx.redirect('/');
    }
  } else if (token) {
    const tokenUser = await validateResetToken(token);
    if (!tokenUser) {
      ctx.statsd.incr('auth.reset.fail', 1);
      await ctx.render('forgot', {
        error: 'Invalid password reset token. It might be expired, or has already been used.',
        csrf: ctx.csrf,
        token: null,
      });
      return;
    }
    await ctx.render('forgot', { csrf: ctx.csrf, token });
  } else if (ctx.request.body.email) {

    try {
      const { email } = ctx.request.body;
      await sendResetToken.call(ctx, email);
      ctx.statsd.incr('auth.reset.request', 1);
      await ctx.render('forgot', {
        message: `We've sent an email with a link to reset your password.
        Be sure to check your spam folder if you it doesn't appear within a few minutes`,
        csrf: ctx.csrf,
        token: null,
      });
      return;
    } catch (error) {
      debug(error);
    }
  } else {
    await ctx.render('forgot', { csrf: ctx.csrf, token: null });
  }
}


export async function logout(ctx) {
  ctx.statsd.incr('auth.logout', 1);
  ctx.cookies.set('r', { expires: new Date(1), path: '/' });
  ctx.session = null;
  ctx.redirect('/');
}


export async function activate(ctx) {
  const { code } = ctx.params;
  if (await activateUser.call(ctx, code)) {
    ctx.statsd.incr('auth.activation', 1);
    ctx.redirect('/');
  } else {
    ctx.throw(400);
  }
}
