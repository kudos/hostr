import { v4 as uuid } from 'uuid';
import { fromToken, fromCookie, setupSession } from '../lib/auth.js';

export async function main(ctx) {
  if (ctx.session.user) {
    if (ctx.query['app-token']) {
      ctx.redirect('/');
      return;
    }
    const token = uuid();
    await ctx.redis.set(token, ctx.session.user.id, { EX: 604800 });
    ctx.session.user.token = token;
    await ctx.render('index', { user: ctx.session.user });
  } else if (ctx.query['app-token']) {
    const user = await fromToken(ctx, ctx.query['app-token']);
    await setupSession(ctx, user);
    ctx.redirect('/');
  } else if (ctx.cookies.r) {
    const user = await fromCookie(ctx, ctx.cookies.r);
    await setupSession(ctx, user);
    ctx.redirect('/');
  } else {
    await ctx.render('marketing');
  }
}

export async function staticPage(ctx, next) {
  if (ctx.session.user) {
    const token = uuid();
    await ctx.redis.set(token, ctx.session.user.id, { EX: 604800 });
    ctx.session.user.token = token;
    await ctx.render('index', { user: ctx.session.user });
  } else {
    switch (ctx.originalUrl) {
      case '/terms':
        await ctx.render('terms');
        break;
      case '/privacy':
        await ctx.render('privacy');
        break;
      case '/pricing':
        await ctx.render('pricing');
        break;
      case '/apps':
        await ctx.render('apps');
        break;
      case '/stats':
        await ctx.render('index', { user: {} });
        break;
      default:
        await next();
    }
  }
}
