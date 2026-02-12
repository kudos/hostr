import path from "path";
import Koa from "koa";
import logger from "koa-logger";
import serve from "koa-static";
import favicon from "koa-favicon";
import compress from "koa-compress";
import { bodyParser } from "@koa/bodyparser";
import websockify from "koa-websocket";
import helmet from "koa-helmet";
import session from "koa-session";
import debugname from "debug";
import * as redis from "./lib/redis.js";
import api, { ws } from "./api/app.js";
import web from "./web/app.js";
import { constants } from "zlib";

const debug = debugname("hostr");

const app = websockify(new Koa());
app.keys = [process.env.COOKIE_KEY];

app.use(bodyParser());

app.use(helmet({ contentSecurityPolicy: false }));

app.use(async (ctx, next) => {
  ctx.set("Server", "Nintendo 64");
  if (ctx.req.headers["x-forwarded-proto"] === "http") {
    ctx.redirect(`https://${ctx.req.headers.host}${ctx.req.url}`);
    return;
  }
  await next();
});

app.use(session({ key: 'koa.sess' }, app));

app.use(redis.middleware());
if (app.env === "development") {
  app.use(logger());
}
app.use(
  compress({
    filter(content_type) {
      return /text/i.test(content_type);
    },
    threshold: 2048,
    gzip: {
      flush: constants.Z_SYNC_FLUSH,
    },
    deflate: {
      flush: constants.Z_SYNC_FLUSH,
    },
    br: false,
  }),
);

app.use(favicon(path.join(import.meta.dirname, "web/public/images/favicon.png")));
app.use(serve(path.join(import.meta.dirname, "web/public/"), { maxage: 31536000000 }));

app.use(api.prefix("/api").routes());
app.use(web.prefix("").routes());

app.ws.use(redis.middleware());
app.ws.use(ws.prefix("/api").routes());

app.on("error", (err, ctx) => {
  if (err.statusCode === 404) return;
  debug(err);
});

if (process.argv[1] === import.meta.filename) {
  app.listen(process.env.PORT || 4040, () => {
    debug("Koa HTTP server listening on port ", process.env.PORT || 4040);
  });
}

export default app;
