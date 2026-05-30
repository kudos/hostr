# Hostr

## About
Hostr is a project I started over ten years ago when I set out to learn web development. Since then it's seen over 100,000 signups and served up over 2 billion file downloads.

It has been through many iterations, but in its current incarnation Hostr uses [Hono](https://hono.dev/) for the backend, and [React](https://react.dev/) and [Webpack](https://webpack.js.org/) for the frontend.

## Getting Started

### Dependencies

Everything is taken care of by a `make build`.

### Enviroment Variable Configuration

See [`.envrc.example`](.envrc.example). Copy it to `.envrc`, modify and `source .envrc` for development. [direnv](https://github.com/direnv/direnv) is pretty nice for doing this automatically when you `cd` into your work directory.

## Usage

### Start the app

```
$ make compose-up
```

### Initialise the environment

```
$ make init migrate
```

### Run the tests

```
$ make test
```

## Licence

My primary motivation is to get to work on Hostr in public. Contributions are welcome and all Javascript is Apache licenced, however the brand is not. The brand includes the name, logo images, CSS and marketing HTML.
