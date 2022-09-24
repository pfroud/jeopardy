import Viz from "@aduh95/viz.js";
import { Operator } from "../operator/Operator";
import { generateDotFileForGraphviz } from "../stateMachine/generateDotFileForGraphviz";
import { GraphvizViewer } from "./GraphvizViewer";

window.addEventListener('DOMContentLoaded', () => {

    if (!window.opener) {
        document.body.innerText = "no window.opener";
        return;
    }

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

    // todo rename this method
    const dotFileString = generateDotFileForGraphviz(stateMachine.getAllStates());

    async function generateSvgFromDotFile(): Promise<string> {
        // from https://github.com/aduh95/viz.js#using-a-bundler
        const viz = new Viz({
            worker: new Worker(
                new URL("./worker.js", import.meta.url),
                { type: "module" }
            )
        });
        return viz.renderString(dotFileString);
    }

    generateSvgFromDotFile()
        .then((svgString) => {
            document.body.innerHTML = svgString;

            const svgElement = document.querySelector("svg");
            svgElement.style.width = "100%";
            const graphvizViewer = new GraphvizViewer(svgElement);
            stateMachine.handleGraphvizViewerReady(graphvizViewer);

        })
        .catch((error) => {
            document.body.innerHTML = error;
            console.error(error);
        });

});
