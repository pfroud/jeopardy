import { AudioManager } from "../AudioManager";
import { Settings } from "../Settings";
import { Operator } from "./Operator";

document.addEventListener("DOMContentLoaded", function () {
    const settings = new Settings();
    const audioManager = new AudioManager();

    window.addEventListener("error", function (errorEvent) {
        const errorDiv = document.createElement("div");
        errorDiv.innerText = errorEvent.message;
        errorDiv.style.backgroundColor = "red";
        errorDiv.style.color = "white";
        errorDiv.style.padding = "20px";
        errorDiv.style.fontSize = "30px";
        errorDiv.style.position = "absolute";
        errorDiv.style.zIndex = "500";
        document.body.prepend(errorDiv);
    });

    // Add global variable so we can access the operator instance in the web browser debugger.
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any
    (window as any).operator = new Operator(audioManager, settings);

});
