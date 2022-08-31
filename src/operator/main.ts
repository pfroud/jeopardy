import { Settings } from "../Settings";
import { AudioManager } from "./AudioManager";
import { Operator } from "./Operator";

document.addEventListener("DOMContentLoaded", function () {
    if (window.location.search.length > 1) {
        console.log("not doing anything because window.location.search is set to something");
        return;
    }
    const settings = new Settings();
    const audioManager = new AudioManager();

    // So we can access the operator instance in the web browser debugger.
    (window as any).operator = new Operator(audioManager, settings);


});
