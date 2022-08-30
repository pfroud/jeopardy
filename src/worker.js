//import initWASM from "@aduh95/viz.js/worker";
// If you are not using a bundler that supports package.json#exports
// use "./node_modules/@aduh95/viz.js/dist/render.browser.js" instead.
import initWASM from "../node_modules/@aduh95/viz.js/dist/render.browser.js";

// You need to configure your bundler to treat `.wasm` file as file to return a URL.
//import wasmURL from "@aduh95/viz.js/wasm";
// With Rollup, use the `@rollup/plugin-url` plugin and add `**/*.wasm` to the
// `include` list in the plugin config.
// With Webpack, use the `file-loader` plugin: "file-loader!@aduh95/viz.js/wasm"

// If you are not using a bundler that supports package.json#exports
// or doesn't have a file-loader plugin to get URL of the asset:
const wasmURL =
    new URL("../node_modules/@aduh95/viz.js/dist/render.wasm", import.meta.url);

initWASM({
    locateFile() {
        return String(wasmURL);
    },
});