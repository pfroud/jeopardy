import { Operator } from "../operator/Operator";
import { Presentation } from "./Presentation";

document.addEventListener("DOMContentLoaded", function () {

    if (!window.opener) {
        document.body.innerHTML =
            `
            To launch the Jeopardy game, open src/operator/operator.html. 
            The operator page will try to open presentation.html. You will probably
            need to tell your web browser to allow the popup.
            `;
        document.body.style.fontSize = "2em";
        return;
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unnecessary-type-assertion, @typescript-eslint/no-explicit-any
    const operator = (window.opener as any).operator as Operator;
    if (!operator) {
        document.body.innerHTML = "no <code>window.opener.operator</code>";
        return;
    }

    // Show errors from the presentation window in the operator window
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

    // Add global variable so we can access the presentation instance in the web browser debugger.
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any
    (window as any).presentation = new Presentation(operator);

});