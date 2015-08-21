System.config({
  defaultJSExtensions: true,
  transpiler: "babel",
  babelOptions: {
    "optional": [
      "runtime"
    ]
  },
  paths: {
    "github:*": "jspm_packages/github/*",
    "npm:*": "jspm_packages/npm/*"
  },

  map: {
    "angular": "npm:angular@1.4.4",
    "angular-reconnecting-websocket": "github:adieu/angular-reconnecting-websocket@0.1.1",
    "angular-strap": "npm:angular-strap@2.3.1",
    "angular/resource": "npm:angular-resource@1.4.4",
    "angular/route": "npm:angular-route@1.4.4",
    "babel": "npm:babel-core@5.8.22",
    "babel-runtime": "npm:babel-runtime@5.8.20",
    "bootstrap-sass": "npm:bootstrap-sass@3.3.5",
    "cferdinandi/smooth-scroll": "github:cferdinandi/smooth-scroll@5.3.7",
    "core-js": "npm:core-js@1.1.1",
    "dropzone": "npm:dropzone@4.0.1",
    "jquery": "npm:jquery@2.1.4",
    "zeroclipboard": "npm:zeroclipboard@2.2.0",
    "github:jspm/nodelibs-buffer@0.1.0": {
      "buffer": "npm:buffer@3.4.2"
    },
    "github:jspm/nodelibs-path@0.1.0": {
      "path-browserify": "npm:path-browserify@0.0.0"
    },
    "github:jspm/nodelibs-process@0.1.1": {
      "process": "npm:process@0.10.1"
    },
    "npm:angular-strap@2.3.1": {
      "buffer": "github:jspm/nodelibs-buffer@0.1.0",
      "fs": "github:jspm/nodelibs-fs@0.1.2",
      "path": "github:jspm/nodelibs-path@0.1.0",
      "process": "github:jspm/nodelibs-process@0.1.1",
      "systemjs-json": "github:systemjs/plugin-json@0.1.0"
    },
    "npm:angular@1.4.4": {
      "process": "github:jspm/nodelibs-process@0.1.1"
    },
    "npm:babel-runtime@5.8.20": {
      "process": "github:jspm/nodelibs-process@0.1.1"
    },
    "npm:buffer@3.4.2": {
      "base64-js": "npm:base64-js@0.0.8",
      "ieee754": "npm:ieee754@1.1.6",
      "is-array": "npm:is-array@1.0.1"
    },
    "npm:core-js@1.1.1": {
      "fs": "github:jspm/nodelibs-fs@0.1.2",
      "process": "github:jspm/nodelibs-process@0.1.1",
      "systemjs-json": "github:systemjs/plugin-json@0.1.0"
    },
    "npm:dropzone@4.0.1": {
      "process": "github:jspm/nodelibs-process@0.1.1"
    },
    "npm:jquery@2.1.4": {
      "process": "github:jspm/nodelibs-process@0.1.1"
    },
    "npm:path-browserify@0.0.0": {
      "process": "github:jspm/nodelibs-process@0.1.1"
    },
    "npm:zeroclipboard@2.2.0": {
      "process": "github:jspm/nodelibs-process@0.1.1"
    }
  }
});
