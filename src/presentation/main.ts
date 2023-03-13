import { Operator } from "../operator/Operator";
import { Presentation } from "./Presentation";

document.addEventListener("DOMContentLoaded", function () {

    if (!window.opener) {
        document.body.innerHTML = "no window.opener";
        return;
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unnecessary-type-assertion, @typescript-eslint/no-explicit-any
    const operator = (window.opener as any).operator as Operator;
    if (!operator) {
        document.body.innerHTML = "no window.opener.operator";
        return;
    }

    // Show errors from the presentation window in the operator window
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

    // Add global variable so we can access the presentation instance in the web browser debugger.
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any
    (window as any).presentation = new Presentation(operator);

});