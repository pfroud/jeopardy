import Viz from "@aduh95/viz.js";
import { Operator } from "../operator/Operator";
import { generateDotFileForGraphviz } from "../stateMachine/generateDotFileForGraphviz"
import { GraphvizViewer } from "./GraphvizViewer";

window.addEventListener('DOMContentLoaded', () => {

    if (!window.opener) {
        document.body.innerText = "window.opener is falsey";
        return;
    }

    if (!(window.opener as any).operator) {
        document.body.innerText = "window.opener.operator is falsey";
        return;
    }

    if (!((window.opener as any).operator as Operator).getStateMachine()) {
        document.body.innerText = "window.opener.operator.stateMachine is falsey";
        return;
    }

    const dotFileString = generateDotFileForGraphviz(((window.opener as any).operator as Operator).getStateMachine().getAllStates());

    generateSvgFromDotFile(dotFileString)
        .then((svgString) => {
            document.body.innerHTML = svgString;

            const svgElement = document.querySelector("svg");
            svgElement.style.width = "100%";
            const graphvizViewer = new GraphvizViewer(svgElement);
            ((window.opener as any).operator as Operator).getStateMachine().handleGraphvizViewerReady(graphvizViewer);

        })
        .catch((error) => {
            document.body.innerHTML = error;
            console.error(error);
        });



});

async function generateSvgFromDotFile(dotFileString: string): Promise<string> {
    // from https://github.com/aduh95/viz.js#using-a-bundler

    const viz = new Viz({
        worker: new Worker(
            new URL("./worker.js", import.meta.url),
            { type: "module" }
        )
    });

    return viz.renderString(dotFileString);
}