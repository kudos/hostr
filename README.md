# Hostr [![Circle CI](https://circleci.com/gh/kudos/hostr.svg?style=svg&circle-token=1b4dec62afcb7960446edf241a5cf9238b8c20ed)](https://circleci.com/gh/kudos/hostr)

[![Join the chat at https://gitter.im/kudos/hostr](https://badges.gitter.im/Join%20Chat.svg)](https://gitter.im/kudos/hostr?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)

## About
Hostr is a project I started almost ten years ago when I set out to learn web development. Since then it's seen over 100,000 signups and served up over 2 billion file downloads.

It has been through many iterations, but in its current incarnation Hostr uses [Koa](http://koajs.com/) for the backend, [Angular](https://angular.io/) and [JSPM](http://jspm.io) for the frontend, and [Babel](https://babeljs.io/) for both.

## Getting Started

### Runtimes

Currently tested and runs on iojs 2.5.0, probably works on earlier releases and on node. Does yet not work on iojs > 3 due to the NAN changes introduced.

### Dependencies

You'll need `graphicsmagick` for image thumbnailing, everything else is taken care of by an `npm install`.

### Enviroment Variable Configuration

See [`.env.example`](.env.example). Copy it to `.env`, modify and `source .env` for development. [autoenv](https://github.com/kennethreitz/autoenv) is pretty nice for doing this automatically when you `cd` into your work directory.

### Deploying to Heroku

Because it uses iojs and graphicsmagick runtimes hostr needs an env variable for `BUILDPACK_URL` set to `https://github.com/ddollar/heroku-buildpack-multi.git` on Heroku.

You'll also need to add Heroku Redis and a MongoDB addon.

## Usage

### Start the app

```
$ npm start
```

This will install and build the frontend too.

Alternatively

```
$ npm run watch
```

Will watch your JS and CSS for changes, rebuild them, and reload the server.

### Run the tests

```
$ npm test
```

Running the tests will also set the indexes required for Mongo.

## Licence

My primary motivation is to get to work on Hostr in public. Contributions are welcome and all Javascript is MIT licenced, however the brand is not. The brand includes the name, logo images, CSS and marketing HTML.
