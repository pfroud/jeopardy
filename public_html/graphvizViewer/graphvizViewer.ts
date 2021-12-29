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

    private readonly DEBUG = true;

    private static readonly SVG_ATTRIBUTE_STATE_TRAIL_INDEX = "data-state-trail-index";
    private static readonly SVG_ATTRIBUTE_TRANSITION_TRAIL_INDEX = "data-transition-trail-index";
    private static readonly TRAIL_LENGTH = 3;
    private static readonly TRAIL_COLORS = ["red", "orange", "yellow"];

    private readonly svg: SVGElement;
    private stateTrail: SVGGElement[] = [];
    private transitionTrail: SVGGElement[] = [];

    constructor(svgDocument: XMLDocument) {
        this.svg = svgDocument.querySelector<SVGElement>("svg");


        // https://stackoverflow.com/a/4906603
        const styleElement = svgDocument.createElementNS("http://www.w3.org/2000/svg", "style");

        const lines: string[] = [];

        for (let i = 0; i < GraphvizViewer.TRAIL_LENGTH; i++) {
            const color = GraphvizViewer.TRAIL_COLORS[i];
            if (i === 0) {
                lines.push(`g[${GraphvizViewer.SVG_ATTRIBUTE_STATE_TRAIL_INDEX}="${i}"] polygon {fill: ${color}; stroke-width: 3}`);
                lines.push(`g[${GraphvizViewer.SVG_ATTRIBUTE_STATE_TRAIL_INDEX}="${i}"] text {font-weight: bold}`);
            } else {
                lines.push(`g[${GraphvizViewer.SVG_ATTRIBUTE_STATE_TRAIL_INDEX}="${i}"] polygon {fill: ${color}}`);
            }

            lines.push(`g[${GraphvizViewer.SVG_ATTRIBUTE_TRANSITION_TRAIL_INDEX}="${i}"] path {stroke: ${color}; stroke-width: 4}`);
            lines.push(`g[${GraphvizViewer.SVG_ATTRIBUTE_TRANSITION_TRAIL_INDEX}="${i}"] polygon {fill: ${color}; stroke: ${color}; stroke-width: 4}`);
            lines.push(`g[${GraphvizViewer.SVG_ATTRIBUTE_TRANSITION_TRAIL_INDEX}="${i}"] text {fill: ${color}; font-weight: bold}`);
        }


        styleElement.textContent = lines.join("\n");
        this.svg.appendChild(styleElement);
    }

    public updateGraphviz(previousStateName: string, newStateName: string): void {

        if (this.DEBUG) {
            console.log(`graphvizViewer: ${previousStateName} --> ${newStateName}`);
        }

        const groupForState = this.svg.querySelector<SVGGElement>(`g#${newStateName}`);
        if (groupForState) {

            // add element to the beginning of the array
            this.stateTrail.unshift(groupForState);

            if (this.stateTrail.length > GraphvizViewer.TRAIL_LENGTH) {
                // remove the last element of the array
                this.stateTrail.pop()?.removeAttribute(GraphvizViewer.SVG_ATTRIBUTE_STATE_TRAIL_INDEX);
            }

            for (let i = 0; i < this.stateTrail.length; i++) {
                this.stateTrail[i].setAttribute(GraphvizViewer.SVG_ATTRIBUTE_STATE_TRAIL_INDEX, i.toString());
            }

        }

        if (previousStateName) {
            const groupForTransition = this.svg.querySelector<SVGGElement>(`g#${previousStateName}_to_${newStateName}`);
            if (groupForTransition) {

                // add element to the beginning ofthe  array
                this.transitionTrail.unshift(groupForTransition);

                if (this.transitionTrail.length > GraphvizViewer.TRAIL_LENGTH) {
                    // remove the last element of the array
                    this.transitionTrail.pop()?.removeAttribute(GraphvizViewer.SVG_ATTRIBUTE_TRANSITION_TRAIL_INDEX);
                }

                for (let i = 0; i < this.transitionTrail.length; i++) {
                    this.transitionTrail[i].setAttribute(GraphvizViewer.SVG_ATTRIBUTE_TRANSITION_TRAIL_INDEX, i.toString());
                }
            }
        }

    }
}