// From https://github.com/aduh95/viz.js#using-a-bundler

import initWASM from "../../node_modules/@aduh95/viz.js/dist/render.browser.js";

const wasmURL =
    new URL("../../node_modules/@aduh95/viz.js/dist/render.wasm", import.meta.url);

initWASM({
    locateFile() {
        // See https://github.com/aduh95/viz.js/issues/27
        return String(wasmURL);
    },
});