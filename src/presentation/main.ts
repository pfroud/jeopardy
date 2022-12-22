import { Presentation } from "./Presentation";

document.addEventListener("DOMContentLoaded", function () {

    if (!window.opener) {
        document.body.innerText = "no window.opener";
        return;
    }

    // Show errors from the presentation window in the operator window
    window.addEventListener("error", function (error) {
        window.opener.console.error("ERROR FROM PRESENTATION WINDOW:");
        window.opener.console.error(error.error);
    });

    // Add global variable so we can access the presentation instance in the web browser debugger.
    (window as any).presentation = new Presentation();

});