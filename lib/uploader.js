import { join } from "path";
import Busboy from "busboy";
import crypto from "crypto";
import fs from "node:fs";
import fsp from "node:fs/promises";
import { imageSize } from "image-size";
import debugname from "debug";
import { HTTPException } from "hono/http-exception";

import { Op } from "sequelize";
import models from "../models/index.js";
import createHostrId from "./hostr-id.js";
import { formatFile } from "./format.js";
import resize from "./resize.js";
import malware from "./malware.js";
import sniff from "./sniff.js";

const debug = debugname("hostr-api:uploader");

const storePath = process.env.UPLOAD_STORAGE_PATH;
const baseURL = process.env.WEB_BASE_URL;
const supported = ["jpeg", "jpg", "png", "gif"];

export default class Uploader {
  constructor(context) {
    this.context = context;
    this.expectedSize = context.req.header("content-length");
    this.tempGuid = context.req.header("hostr-guid");
    this.remoteIp = (
      context.req.header("x-forwarded-for") ||
      context.env?.incoming?.socket?.remoteAddress ||
      "0.0.0.0"
    ).split(",")[0].trim();
    this.md5sum = crypto.createHash("md5");

    this.lastPercent = 0;
    this.percentComplete = 0;
    this.lastTick = 0;
    this.receivedSize = 0;
  }

  async checkLimit() {
    const count = await models.file.count({
      where: {
        userId: this.context.get("user").id,
        createdAt: { [Op.gt]: Date.now() - 86400000 },
      },
    });
    const userLimit = this.context.get("user").daily_upload_allowance;
    const underLimit = count < userLimit || userLimit === "unlimited";
    if (!underLimit) {
      throw new HTTPException(400, {
        message: `{"error": {"message": "Daily upload limits (${userLimit}) exceeded.", "code": 602}}`,
      });
    }
    return true;
  }

  async accept() {
    return new Promise((resolve) => {
      this.upload = Busboy({
        headers: this.context.env.incoming.headers,
        limits: { files: 1 },
        highWaterMark: 10000000,
      });

      this.upload.on("file", async (fieldname, file, { filename }) => {
        this.upload.filename = filename;

        this.file = await models.file.create({
          id: await createHostrId(),
          name: this.upload.filename
            .replace(/[^a-zA-Z0-9\.\-_\s]/g, "")
            .replace(/\s+/g, ""), // eslint-disable-line no-useless-escape
          originalName: this.upload.filename,
          userId: this.context.get("user").id,
          status: "uploading",
          type: sniff(this.upload.filename),
          ip: this.remoteIp,
          accessedAt: null,
          width: null,
          height: null,
        });
        await this.file.save();

        this.path = join(this.file.id[0], `${this.file.id}_${this.file.name}`);
        this.localStream = fs.createWriteStream(join(storePath, this.path));
        this.localStream.on("finish", () => {
          resolve();
        });

        file.on("data", (data) => {
          this.receivedSize += data.length;
          if (this.receivedSize > this.context.get("user").max_filesize) {
            fsp.unlink(join(storePath, this.path));
            throw new HTTPException(413, {
              message: '{"error": {"message": "The file you uploaded is too large.", "code": 601}}',
            });
          }

          this.localStream.write(data);

          this.percentComplete = Math.floor(
            (this.receivedSize * 100) / this.expectedSize,
          );
          if (
            this.percentComplete > this.lastPercent &&
            this.lastTick < Date.now() - 1000
          ) {
            const progressEvent = `{"type": "file-progress", "data": {"id": "${this.file.id}", "complete": ${this.percentComplete}}}`;
            this.context.get("redis").publish(`/file/${this.file.id}`, progressEvent);
            this.context.get("redis").publish(`/user/${this.context.get("user").id}`, progressEvent);
            this.lastTick = Date.now();
          }
          this.lastPercent = this.percentComplete;

          this.md5sum.update(data);
        });

        debug("accepted");
        const accepted = `{"type": "file-accepted", "data": {"id": "${this.file.id}", "guid": "${this.tempGuid}", "href": "${baseURL}/${this.file.id}"}}`;
        this.context.get("redis").publish(`/user/${this.context.get("user").id}`, accepted);

        file.on("end", () => {
          this.file.size = this.receivedSize;
          this.file.md5 = this.md5sum.digest("hex");
          this.localStream.end();
          this.processingEvent();
        });
      });
      this.context.env.incoming.pipe(this.upload);
    });
  }

  processingEvent() {
    debug("processing");
    const processing = `{"type": "file-progress", "data": {"id": "${this.file.id}", "complete": 100}}`;
    this.context.get("redis").publish(`/file/${this.file.id}`, processing);
    this.context.get("redis").publish(`/user/${this.context.get("user").id}`, processing);
  }

  async processImage() {
    return new Promise((resolve) => {
      let size;
      try {
        if (supported.indexOf(this.path.split(".").pop().toLowerCase()) < 0) {
          resolve();
          return;
        }
        size = imageSize(fs.readFileSync(join(storePath, this.path)));
      } catch (err) {
        debug(err);
        resolve();
        return;
      }

      if (!size.width || supported.indexOf(size.type) < 0) {
        resolve();
        return;
      }

      this.file.width = size.width;
      this.file.height = size.height;

      Promise.all([
        this.resizeImage(size.type, size, { width: 150, height: 150 }),
        this.resizeImage(size.type, size, { width: 970 }),
      ]).then(() => {
        resolve(size);
      });
    });
  }

  resizeImage(type, currentSize, dim) {
    return resize(join(storePath, this.path), type, currentSize, dim)
      .then((image) => {
        const resizedPath = join(
          this.file.id[0],
          String(dim.width),
          `${this.file.id}_${this.file.name}`,
        );
        debug("Writing file");
        debug(join(storePath, resizedPath));
        return fsp.writeFile(join(storePath, resizedPath), image).catch(debug);
      })
      .catch(debug);
  }

  async finalise() {
    debug("finalise");
    this.file.size = this.receivedSize;
    this.file.status = "active";
    this.file.processed = "true";
    await this.file.save();
    this.completeEvent();
  }

  completeEvent() {
    debug("complete");
    const complete = `{"type": "file-added", "data": ${JSON.stringify(formatFile(this.file))}}`;
    this.context.get("redis").publish(`/file/${this.file.id}`, complete);
    this.context.get("redis").publish(`/user/${this.context.get("user").id}`, complete);
  }

  malwareScan() {
    if (process.env.VIRUSTOTAL_KEY) {
      process.nextTick(async () => {
        debug("Malware Scan");
        const result = await malware(this.file);
        if (result) {
          this.file.malwarePositives = result.positives;
          this.file.save();
          const fileMalware = await models.malware.create({
            fileId: this.file.id,
            positives: result.positives,
            virustotal: result,
          });
          fileMalware.save();
        }
      });
    } else {
      debug("Skipping Malware Scan, VIRUSTOTAL env variable not found.");
    }
  }
}
