window.addEventListener('DOMContentLoaded', () => {

    if (!window.opener) {
        document.body.innerText = "window.opener is falsey";
        return;
    }

    if (!(window.opener).operator) {
        document.body.innerText = "window.opener.operator is falsey";
        return;
    }

    if (!window.opener.operator.stateMachine) {
        document.body.innerText = "window.opener.operator.stateMachine is falsey";
        return;
    }

    // https://stackoverflow.com/a/3379830
    const objectElement = document.querySelector<HTMLObjectElement>("object#graphviz");
    objectElement.addEventListener("load", function () {
        const svgDocument = objectElement.contentDocument;
        const thing = new GraphvizViewer(svgDocument);
        window.opener.operator.stateMachine.handleGraphvizViewerReady(thing);

    });
});



export class GraphvizViewer {

    private static readonly SVG_GROUP_CLASS_NAME_PRESENT_STATE = "present-state";
    private static readonly SVG_GROUP_CLASS_NAME_LAST_TRANSITION = "last-transition";
    private static readonly THE_COLOR = "red";

    private readonly svg: SVGElement;
    // private stateTrail: SVGGElement[] = new Array(3);

    constructor(svgDocument: XMLDocument) {
        this.svg = svgDocument.querySelector<SVGElement>("svg");


        // https://stackoverflow.com/a/4906603
        var styleElement = svgDocument.createElementNS("http://www.w3.org/2000/svg", "style");
        styleElement.textContent =
            `g.${GraphvizViewer.SVG_GROUP_CLASS_NAME_PRESENT_STATE} polygon {fill: ${GraphvizViewer.THE_COLOR}; stroke-width: 3}\n` +
            `g.${GraphvizViewer.SVG_GROUP_CLASS_NAME_PRESENT_STATE} text {font-weight: bold;}\n` +
            `g.${GraphvizViewer.SVG_GROUP_CLASS_NAME_LAST_TRANSITION} path {stroke: ${GraphvizViewer.THE_COLOR}; stroke-width: 4}\n` +
            `g.${GraphvizViewer.SVG_GROUP_CLASS_NAME_LAST_TRANSITION} polygon {fill: ${GraphvizViewer.THE_COLOR}; stroke: ${GraphvizViewer.THE_COLOR}}\n` +
            `g.${GraphvizViewer.SVG_GROUP_CLASS_NAME_LAST_TRANSITION} text {fill: ${GraphvizViewer.THE_COLOR}; font-weight: bold}`;
        this.svg.appendChild(styleElement);
    }

    public updateGraphviz(previousStateName: string, newStateName: string): void {
        const groupForState = this.svg.querySelector<SVGGElement>(`g#${newStateName}`);
        if (!groupForState) {
            // todo is this how you check if it found anything???
            console.warn(`couldn't find a group with ID "${newStateName}"`);
            return;
        }
        if (previousStateName) {
            /*
            TODO
            Some of the states transition immediately (e.g. a conditional transition).
            Would be nice to show that the state was active.
            Actually we should show a trail of the previous two or three states.
            AND the transitions we took - need to ass IDs somehow.
            */
            this.svg.querySelector(`g#${previousStateName}`).classList.remove(GraphvizViewer.SVG_GROUP_CLASS_NAME_PRESENT_STATE);
        }

        groupForState.classList.add(GraphvizViewer.SVG_GROUP_CLASS_NAME_PRESENT_STATE);

        const transition = this.svg.querySelector(`g#${previousStateName}_to_${newStateName}`);
        if (transition) {
            transition.classList.add(GraphvizViewer.SVG_GROUP_CLASS_NAME_LAST_TRANSITION);
        }

    }
}