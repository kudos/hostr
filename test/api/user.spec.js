import assert from "assert";
import { agent } from "supertest";
import { getRequestListener } from "@hono/node-server";
import app from "../../app.js";

const request = agent(getRequestListener(app.fetch));

describe("hostr-api user", function () {
  describe("when GET /user", function () {
    it("should receive a user object", function (done) {
      request
        .get("/api/user")
        .auth("test@hostr.co", "test-password")
        .expect(function (response) {
          assert(response.body.email === "test@hostr.co");
        })
        .expect(200)
        .end(done);
    });
  });

  describe("when GET /user/token", function () {
    it("should receive a user token object", function (done) {
      request
        .get("/api/user/token")
        .auth("test@hostr.co", "test-password")
        .expect(function (response) {
          assert(response.body.token);
        })
        .expect(200)
        .end(done);
    });
  });

  describe("when GET /user/settings", function () {
    it("should update user password", function (done) {
      request
        .post("/api/user/settings")
        .send({
          current_password: "test-password",
          new_password: "test-password",
        })
        .auth("test@hostr.co", "test-password")
        .expect(200)
        .expect(function (response) {
          assert(response.body instanceof Object);
        })
        .end(done);
    });
  });
});
