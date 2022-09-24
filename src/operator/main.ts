import { Settings } from "../Settings";
import { AudioManager } from "./AudioManager";
import { Operator } from "./Operator";

document.addEventListener("DOMContentLoaded", function () {
    const settings = new Settings();
    const audioManager = new AudioManager();

    // Add global variable so we can access the operator instance in the web browser debugger.
    (window as any).operator = new Operator(audioManager, settings);

});
