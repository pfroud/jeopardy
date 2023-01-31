import { Operator } from "../operator/Operator";
import { Presentation } from "./Presentation";

document.addEventListener("DOMContentLoaded", function () {

    if (!window.opener) {
        document.body.innerHTML = "no window.opener";
        return;
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unnecessary-type-assertion
    const operator = (window.opener as any).operator as Operator;
    if (!operator) {
        document.body.innerHTML = "no window.opener.operator";
        return;
    }

    // close the presentation window if the operator window closes
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
    window.opener.addEventListener("unload", () => close());

    // Show errors from the presentation window in the operator window
    window.addEventListener("error", function (errorEvent) {
        // suppress error TS2339 "property 'console' does not exist on type 'Window'"
        const castOpener = window.opener as (Window & typeof globalThis);
        castOpener.console.error("ERROR FROM PRESENTATION WINDOW:");
        castOpener.console.error(errorEvent.error);
    });

    // Add global variable so we can access the presentation instance in the web browser debugger.
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    (window as any).presentation = new Presentation(operator);

});