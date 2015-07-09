System.config({
  "defaultJSExtensions": true,
  "transpiler": "babel",
  "babelOptions": {
    "optional": [
      "runtime"
    ]
  },
  "paths": {
    "github:*": "jspm_packages/github/*",
    "npm:*": "jspm_packages/npm/*"
  }
});

System.config({
  "map": {
    "angular": "npm:angular@1.4.3",
    "angular-reconnecting-websocket": "github:adieu/angular-reconnecting-websocket@0.1.1",
    "angular-strap": "npm:angular-strap@2.1.2",
    "angular/resource": "npm:angular-resource@1.4.3",
    "angular/route": "npm:angular-route@1.4.3",
    "babel": "npm:babel-core@5.8.5",
    "babel-runtime": "npm:babel-runtime@5.8.5",
    "bootstrap-sass": "npm:bootstrap-sass@3.3.5",
    "cferdinandi/smooth-scroll": "github:cferdinandi/smooth-scroll@5.3.7",
    "core-js": "npm:core-js@0.9.18",
    "dropzone": "npm:dropzone@4.0.1",
    "jquery": "npm:jquery@2.1.4",
    "zeroclipboard": "npm:zeroclipboard@2.2.0",
    "github:jspm/nodelibs-path@0.1.0": {
      "path-browserify": "npm:path-browserify@0.0.0"
    },
    "github:jspm/nodelibs-process@0.1.1": {
      "process": "npm:process@0.10.1"
    },
    "github:jspm/nodelibs-util@0.1.0": {
      "util": "npm:util@0.10.3"
    },
    "npm:angular-strap@2.1.2": {
      "fs": "github:jspm/nodelibs-fs@0.1.2",
      "path": "github:jspm/nodelibs-path@0.1.0",
      "process": "github:jspm/nodelibs-process@0.1.1",
      "systemjs-json": "github:systemjs/plugin-json@0.1.0",
      "util": "github:jspm/nodelibs-util@0.1.0"
    },
    "npm:angular@1.4.3": {
      "process": "github:jspm/nodelibs-process@0.1.1"
    },
    "npm:babel-runtime@5.8.5": {
      "process": "github:jspm/nodelibs-process@0.1.1"
    },
    "npm:core-js@0.9.18": {
      "fs": "github:jspm/nodelibs-fs@0.1.2",
      "process": "github:jspm/nodelibs-process@0.1.1",
      "systemjs-json": "github:systemjs/plugin-json@0.1.0"
    },
    "npm:dropzone@4.0.1": {
      "process": "github:jspm/nodelibs-process@0.1.1"
    },
    "npm:inherits@2.0.1": {
      "util": "github:jspm/nodelibs-util@0.1.0"
    },
    "npm:jquery@2.1.4": {
      "process": "github:jspm/nodelibs-process@0.1.1"
    },
    "npm:path-browserify@0.0.0": {
      "process": "github:jspm/nodelibs-process@0.1.1"
    },
    "npm:util@0.10.3": {
      "inherits": "npm:inherits@2.0.1",
      "process": "github:jspm/nodelibs-process@0.1.1"
    },
    "npm:zeroclipboard@2.2.0": {
      "process": "github:jspm/nodelibs-process@0.1.1"
    }
  }
});

