import { Presentation } from "./Presentation";

document.addEventListener("DOMContentLoaded", function () {

    if (!window.opener) {
        document.body.innerText = "no window.opener";
        return;
    }

    // Show errors from the presentation window in the operator window
    window.addEventListener("error", function (errorObj) {
        // suppress error TS2339 "property 'console' does not exist on type 'Window'"
        const castOpener = window.opener as (Window & typeof globalThis);
        castOpener.console.error("ERROR FROM PRESENTATION WINDOW:");
        castOpener.console.error(errorObj.error);
    });

    // Add global variable so we can access the presentation instance in the web browser debugger.
    (window as any).presentation = new Presentation();

});