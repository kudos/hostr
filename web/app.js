import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { readFileSync } from 'fs';
import path from 'path';
import ejs from 'ejs';
import { csrfMiddleware } from '../lib/csrf.js';
import * as index from './routes/index.js';
import * as file from './routes/file.js';
import * as user from './routes/user.js';

const errorTemplate = readFileSync(
  path.join(import.meta.dirname, 'public', 'error.html'),
  'utf8',
);

const web = new Hono();

web.onError((err, c) => {
  const status = err instanceof HTTPException ? err.status : (err.status || 500);
  const error = (err instanceof HTTPException && status < 500)
    ? err.message
    : 'Internal Server Error';
  return c.html(ejs.render(errorTemplate, { status, error }), status);
});

web.notFound((c) => c.html(
  ejs.render(errorTemplate, { status: 404, error: 'Not Found' }),
  404,
));

web.use(csrfMiddleware());

web.get('/', index.main);
web.get('/account', index.main);

web.get('/signin', user.signin);
web.post('/signin', user.signin);
web.get('/signup', user.signup);
web.post('/signup', user.signup);
web.get('/logout', user.logout);
web.post('/logout', user.logout);
web.get('/forgot', user.forgot);
web.get('/forgot/:token', user.forgot);
web.post('/forgot', user.forgot);
web.post('/forgot/:token', user.forgot);
web.get('/activate/:code', user.activate);

web.get('/terms', index.staticPage);
web.get('/privacy', index.staticPage);
web.get('/apps', index.staticPage);
web.get('/stats', index.staticPage);

web.get('/:id', file.landing);
web.get('/file/:id/:name', file.get);
web.get('/file/:size/:id/:name', file.get);
web.get('/files/:id/:name', file.get);
web.get('/download/:id/:name', (c) => c.redirect(`/${c.req.param('id')}`));

web.get('/updaters/mac', (c) => c.redirect('/updaters/mac.xml'));
web.get('/updaters/mac/changelog', (c) => {
  const html = ejs.renderFile(
    path.join(import.meta.dirname, 'views', 'mac-update-changelog.ejs'),
    {},
  );
  return html.then((h) => c.html(h));
});

export default web;
