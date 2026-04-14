import models from '../../models/index.js';
import { formatFile } from '../../lib/format.js';
import Uploader from '../../lib/uploader.js';
import { HTTPException } from 'hono/http-exception';

export async function post(c) {
  const contentType = c.req.header('content-type') || '';
  if (!contentType.includes('multipart/')) {
    throw new HTTPException(400, { message: 'Expected multipart/form-data' });
  }
  const uploader = new Uploader(c);
  await uploader.checkLimit();
  await uploader.accept();
  await uploader.processImage();
  await uploader.finalise();
  uploader.completeEvent();
  uploader.malwareScan();
  return c.json(formatFile(uploader.file), 201);
}

export async function list(c) {
  let limit = 20;
  const perpage = c.req.query('perpage');
  if (perpage === '0') {
    limit = 1000;
  } else if (perpage && parseInt(perpage, 10) > 0) {
    limit = parseInt(perpage, 10);
  }

  let offset = 0;
  const page = c.req.query('page');
  if (page) {
    offset = (parseInt(page, 10) - 1) * limit;
  }

  const files = await models.file.findAll({
    where: { userId: c.get('user').id, processed: true },
    order: [['createdAt', 'DESC']],
    offset,
    limit,
  });
  return c.json(files.map(formatFile));
}

export async function get(c) {
  const file = await models.file.findOne({ where: { id: c.req.param('id') } });
  if (!file) throw new HTTPException(404, { message: '{"error": {"message": "File not found", "code": 604}}' });
  const user = await file.getUser();
  if (!user || user.banned) throw new HTTPException(404, { message: '{"error": {"message": "File not found", "code": 604}}' });
  return c.json(formatFile(file));
}

export async function del(c) {
  const file = await models.file.findOne({
    where: { id: c.req.param('id'), userId: c.get('user').id },
  });
  if (!file) throw new HTTPException(401, { message: '{"error": {"message": "File not found", "code": 604}}' });
  await file.destroy();
  const event = JSON.stringify({ type: 'file-deleted', data: { id: c.req.param('id') } });
  await c.get('redis').publish(`/file/${c.req.param('id')}`, event);
  await c.get('redis').publish(`/user/${c.get('user').id}`, event);
  return new Response(null, { status: 204 });
}
