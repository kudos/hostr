# Hostr

## About
Hostr is a project I started almost ten years ago when I set out to learn web development. Since then it's seen over 100,000 signups and served up over 2 billion file downloads.

It has been through many iterations, but in its current incarnation Hostr uses [Koa](http://koajs.com/) for the backend, [Angular](https://angular.io/) and [JSPM](http://jspm.io) for the frontend, and [Babel](https://babeljs.io/) for both.

## Getting Started

### Dependencies

Everything is taken care of by an `make build`.

### Enviroment Variable Configuration

See [`.envrc.example`](.envrc.example). Copy it to `.envrc`, modify and `source .envrc` for development. [direnv](https://github.com/direnv/direnv) is pretty nice for doing this automatically when you `cd` into your work directory.

## Usage

### Start the app

```
$ make docker-compose-up
```

### Initialise the environment

```
$ make init migrate
```

### Run the tests

```
$ make test
```

Running the tests will also set the indexes required for Mongo.

## Licence

My primary motivation is to get to work on Hostr in public. Contributions are welcome and all Javascript is Apache licenced, however the brand is not. The brand includes the name, logo images, CSS and marketing HTML.
