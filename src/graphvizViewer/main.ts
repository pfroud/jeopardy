import Viz from "@aduh95/viz.js";
import { Operator } from "../operator/Operator";
import { stateMachineToGraphviz } from "./generateDotFileForGraphviz";
import { GraphvizViewer } from "./GraphvizViewer";

window.addEventListener('DOMContentLoaded', () => {

    if (!window.opener) {
        document.body.innerText = "no window.opener";
        return;
    }

    window.opener.addEventListener("unload", () => close());

    const operator = ((window.opener as any).operator as Operator);
    if (!operator) {
        document.body.innerText = "no window.opener.operator";
        return;
    }

    const stateMachine = operator.getStateMachine();
    if (!stateMachine) {
        document.body.innerText = "no window.opener.operator.stateMachine";
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
            const svgElement = document.querySelector("svg");
            svgElement.setAttribute("width", "100%");
            svgElement.removeAttribute("height");
            const graphvizViewer = new GraphvizViewer(svgElement);
            stateMachine.handleGraphvizViewerReady(graphvizViewer);

        })
        .catch((error) => {
            document.body.innerHTML = error;
            console.error(error);
        });

});
