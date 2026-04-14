import path from "path";
import { createHash } from "crypto";
import { readFileSync } from "fs";
import Router from "@koa/router";
import CSRF from "koa-csrf";
import views from "@ladjs/koa-views";
import StatsD from "statsy";
import ejs from "ejs";

import stats from "../lib/koa-statsd.js";
import * as index from "./routes/index.js";
import * as file from "./routes/file.js";
import * as user from "./routes/user.js";

function fileHash(filepath) {
  try {
    const content = readFileSync(path.join(import.meta.dirname, filepath));
    return createHash("md5").update(content).digest("hex").slice(0, 8);
  } catch {
    return "0";
  }
}

const assetVersions = {
  app: fileHash("public/styles/app.css"),
  style: fileHash("public/styles/style.css"),
  bundle: fileHash("public/build/bundle.js"),
};

const router = new Router();

const errorTemplate = readFileSync(
  path.join(import.meta.dirname, "public", "error.html"),
  "utf8",
);

router.use(async (ctx, next) => {
  try {
    await next();
    if (ctx.status === 404 && !ctx.body) {
      ctx.status = 404;
      ctx.type = "html";
      ctx.body = ejs.render(errorTemplate, { status: 404, error: "Not Found" });
    }
  } catch (err) {
    const status = err.status || err.statusCode || 500;
    ctx.status = status;
    ctx.type = "html";
    ctx.body = ejs.render(errorTemplate, {
      status,
      error: err.expose ? err.message : "Internal Server Error",
    });
  }
});

const statsdOpts = { prefix: "hostr-web", host: process.env.STATSD_HOST };
router.use(stats(statsdOpts));
const statsd = new StatsD(statsdOpts);
router.use(async (ctx, next) => {
  ctx.statsd = statsd;
  await next();
});

router.use(async (ctx, next) => {
  Object.assign(ctx.state, {
    session: ctx.session,
    baseURL: process.env.WEB_BASE_URL,
    apiURL: process.env.API_BASE_URL,
    assetVersions,
  });
  await next();
});

router.use(
  new CSRF({
    excludedMethods: ["GET", "HEAD", "OPTIONS"],
    disableQuery: false,
    errorHandler(ctx) {
      ctx.throw(403, "Invalid CSRF token");
    },
  }),
);

router.use(
  views(path.join(import.meta.dirname, "views"), {
    extension: "ejs",
  }),
);

router.get("/", index.main);
router.get("/account", index.main);

router.get("/signin", user.signin);
router.post("/signin", user.signin);
router.get("/signup", user.signup);
router.post("/signup", user.signup);
router.get("/logout", user.logout);
router.post("/logout", user.logout);
router.get("/forgot", user.forgot);
router.get("/forgot/:token", user.forgot);
router.post("/forgot/:token", user.forgot);
router.post("/forgot", user.forgot);
router.get("/activate/:code", user.activate);

router.get("/terms", index.staticPage);
router.get("/privacy", index.staticPage);

router.get("/apps", index.staticPage);
router.get("/stats", index.staticPage);

router.get("/:id", file.landing);
router.get("/file/:id/:name", file.get);
router.get("/file/:size/:id/:name", file.get);
router.get("/files/:id/:name", file.get);
router.get("/download/:id/:name", async (ctx, id) => {
  ctx.redirect(`/${id}`);
});

router.get("/updaters/mac", async (ctx) => {
  ctx.redirect("/updaters/mac.xml");
});
router.get("/updaters/mac/changelog", async (ctx) => {
  await ctx.render("mac-update-changelog");
});

export default router;
