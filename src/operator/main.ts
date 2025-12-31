import { AudioManager } from "../AudioManager";
import { Settings } from "../Settings";
import { Operator } from "./Operator";

document.addEventListener("DOMContentLoaded", function () {
    const settings = new Settings();
    const audioManager = new AudioManager();

    window.addEventListener("error", function (errorEvent) {
        const errorDiv = document.createElement("div");
        errorDiv.innerText = errorEvent.message;
        errorDiv.style.backgroundColor = "darkred";
        errorDiv.style.color = "white";
        errorDiv.style.padding = "20px";
        errorDiv.style.fontSize = "30px";
        errorDiv.style.position = "absolute";
        errorDiv.style.zIndex = "500";
        errorDiv.style.margin = "20px";
        errorDiv.style.border = "5px solid red";

        const closeButton = document.createElement("button");
        closeButton.innerHTML = "&times;";
        closeButton.addEventListener("click", () => errorDiv.remove());
        closeButton.style.position = "absolute";
        closeButton.style.top = "-15px";
        closeButton.style.right = "-12px";
        closeButton.style.width = "30px";
        closeButton.style.height = "30px";
        closeButton.style.fontSize = "30px";
        closeButton.style.padding = "0px";
        closeButton.style.cursor = "pointer";
        closeButton.style.lineHeight = "0px";
        errorDiv.append(closeButton);

        document.body.prepend(errorDiv);
    });

    // Add global variable so we can access the operator instance in the web browser debugger.
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any
    (window as any).operator = new Operator(audioManager, settings);

});
