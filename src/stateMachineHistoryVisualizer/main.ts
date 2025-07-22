import Viz from "@aduh95/viz.js";
import { querySelectorAndCheck } from "../commonFunctions";
import { Operator } from "../operator/Operator";
import { StateMachineHistoryVisualizer } from "./StateMachineHistoryVisualizer";
import { stateMachineToGraphviz } from "./generateDotFileForGraphviz";

window.addEventListener('DOMContentLoaded', () => {

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

    const stateMachine = operator.getStateMachine();
    if (!stateMachine) {
        document.body.innerHTML = "no window.opener.operator.stateMachine";
        return;
    }

    // Close the state machine viewer window if the operator window closes.
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
    window.opener.addEventListener("unload", () => close());

    /*
    There are two steps to show a state diagram:
    1. Convert Javascript array of states/transitions to Graphviz language string.
    2. Render the Graphviz language string to SVG using viz.js.
    */

    const graphvizLanguageString = stateMachineToGraphviz(stateMachine.getAllStates());

    const copyButton = document.createElement("button");
    copyButton.innerText = "Copy graphviz language string to clipboard";
    copyButton.addEventListener("click", () => { window.navigator.clipboard.writeText(graphvizLanguageString); });
    document.body.append(copyButton);

    async function renderGraphvizToSvg(graphvizInput: string): Promise<string> {
        // from https://github.com/aduh95/viz.js#using-a-bundler
        const viz = new Viz({
            worker: new Worker(
                new URL("./worker.js", import.meta.url),
                { type: "module" }
            )
        });
        // Newlines in the node labels don't work https://github.com/aduh95/viz.js/issues/29
        return viz.renderString(graphvizInput, { format: "svg", engine: "dot" });
    }

    renderGraphvizToSvg(graphvizLanguageString)
        .then(svgString => {
            document.body.insertAdjacentHTML("beforeend", svgString);

            // The body will now contain an <svg> tag.
            const svgElement = querySelectorAndCheck(document, "svg");
            svgElement.setAttribute("width", "100%");
            svgElement.removeAttribute("height");

            stateMachine.addStateMachineHistoryVisualizer(new StateMachineHistoryVisualizer(svgElement));

        })
        .catch((error: unknown) => {
            document.body.append(String(error));
            console.error(error);
        });

});
