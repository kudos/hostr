import Router from "@koa/router";
import cors from "@koa/cors";
import debugname from "debug";

import auth from "./lib/auth.js";
import * as user from "./routes/user.js";
import * as file from "./routes/file.js";

const debug = debugname("hostr-api");

const router = new Router();

router.use(
  cors({
    origin: "*",
    credentials: true,
  }),
);

router.use(async (ctx, next) => {
  try {
    await next();

    if (ctx.response.status === 404 && !ctx.response.body) {
      ctx.throw(404);
    }
  } catch (err) {
    if (err.status === 401) {
      ctx.set("WWW-Authenticate", "Basic");
      ctx.status = 401;
      ctx.body = err.message;
    } else if (err.status === 404) {
      ctx.status = 404;
      ctx.body = {
        error: {
          message: "File not found",
          code: 604,
        },
      };
    } else if (!err.status) {
      throw err;
    } else {
      ctx.status = err.status;
      ctx.body = err.message;
    }
  }
  ctx.type = "application/json";
});

router.delete("/file/:id", auth, file.del);
router.get("/user", auth, user.get);
router.get("/user/token", auth, user.token);
router.get("/token", auth, user.token);

router.post("/user/settings", auth, user.settings);
router.post("/user/delete", auth, user.deleteUser);

router.get("/file", auth, file.list);
router.post("/file", auth, file.post);
router.get("/file/:id", file.get);

// Hack, if no route matches here, router does not dispatch at all
router.get("{/*path}", async (ctx) => {
  ctx.throw(404);
});

export const ws = new Router();

ws.all("/user", user.events);

export default router;
