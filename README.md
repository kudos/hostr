# Hostr [![Circle CI](https://circleci.com/gh/kudos/hostr.svg?style=svg&circle-token=1b4dec62afcb7960446edf241a5cf9238b8c20ed)](https://circleci.com/gh/kudos/hostr)

## Getting Started

### Runtimes

Acquire [iojs](https://iojs.org) somehow, using [nvm](https://github.com/creationix/nvm), [n](https://github.com/tj/n). Or if you don't have or want regular node installed globally just use homebrew `brew install iojs && brew link iojs --force`.

### Dependencies

You'll need `graphicsmagick` for image thumbnailing, everything else is taken care of by an `npm install`.

### Databases

You'll need Redis for session and pubsub and MongoDB for persistent storage, `brew install redis mongodb`.

### Configuration

Configuration is all sucked in from the environment.

##### AWS

File are always uploaded to S3, but they can optionally be written do disk and cached locally.

`AWS_ACCESS_KEY_ID` **required**

`AWS_SECRET_ACCESS_KEY` **required**

`AWS_BUCKET` **required**

##### Email

`MANDRILL_KEY` **required**

`EMAIL_FROM` - defaults to `nobody@example.com`

##### Databases

`REDIS_URL` - defaults to `redis://localhost:6379`

`MONGO_URL` - defaults to `mongodb://localhost:27017/hostr`

The database connections default to connecting locally if an env variable isn't found. The following indexes are required.

```js
db.remember.ensureIndex({"created":1}, {expireAfterSeconds: 2592000})
```

```js
db.file.ensureIndex({"owner" : 1, "status" : 1, "time_added" : -1});
```

##### Local cache

`LOCAL_CACHE` - defaults to `false`.

`LOCAL_PATH` - defaults to `~/.hostr/uploads`. if `LOCAL_CACHE` is `true` will store files locally and not just on S3/GCS.

##### SPDY

If you want to use SPDY, add an SSL key and cert.

`LOCALHOST_KEY`

`LOCALHOST_CRT`

##### App

`BASE_URL` - defaults to `https://localhost:4040`

`FILE_HOST` - used by API for absolute file urls, defaults to `$BASE_URL`

`API_URL` - defaults to `/api`

`PORT` - defaults to `4040`.

`VIRUSTOTAL` - API key enables Virustotal integration.

`SENTRY_DSN` - DSN enables Sentry integration.

Additionally, Hostr uses [debug](https://github.com/visionmedia/debug) so you can use the `DEBUG` environment variable something like `DEBUG=hostr*` to get debug output.

### Deploying to Heroku

Because it uses iojs and graphicsmagick runtimes hostr needs an env variable for `BUILDPACK_URL` set to `https://github.com/ddollar/heroku-buildpack-multi.git`.

You'll also need to add Heroku Redis and a MongoDB addon.

## Usage

### Start the app

`npm start` or to live reload `npm run watch`

### Run the tests

`npm test`

## Licence

The code is MIT licenced, the brand is not. This applies to the logo, name and colour scheme.
