import Viz from "@aduh95/viz.js";
import { querySelectorSVGAndCheck } from "../commonFunctions";
import { Operator } from "../operator/Operator";
import { StateMachineViewer } from "./StateMachineViewer";
import { stateMachineToGraphviz } from "./generateDotFileForGraphviz";

window.addEventListener('DOMContentLoaded', () => {

    if (!window.opener) {
        document.body.innerHTML = "no window.opener";
        return;
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
    window.opener.addEventListener("unload", () => close());

    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unnecessary-type-assertion, @typescript-eslint/no-explicit-any
    const operator = (window.opener as any).operator as Operator;
    if (!operator) {
        document.body.innerHTML = "no window.opener.operator";
        return;
    }

    const stateMachine = operator.getStateMachine();
    if (!stateMachine) {
        document.body.innerHTML = "no window.opener.operator.stateMachine";
        return;
    }

    const graphvizLanguageString = stateMachineToGraphviz(stateMachine.getAllStates());

    async function getSvgString(): Promise<string> {
        // from https://github.com/aduh95/viz.js#using-a-bundler
        const viz = new Viz({
            worker: new Worker(
                new URL("./worker.js", import.meta.url),
                { type: "module" }
            )
        });
        return viz.renderString(graphvizLanguageString);
    }

    getSvgString()
        .then((svgString) => {
            document.body.innerHTML = svgString;

            // the body will now contain an <svg> tag
            const svgElement = querySelectorSVGAndCheck(document, "svg");
            svgElement.setAttribute("width", "100%");
            svgElement.removeAttribute("height");
            const stateMachineViewer = new StateMachineViewer(svgElement);
            stateMachine.handleStateMachineViewerReady(stateMachineViewer);

        })
        .catch((error) => {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            document.body.innerHTML = error;
            console.error(error);
        });

});
