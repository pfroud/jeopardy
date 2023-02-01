export class StateMachineViewer {

    private readonly DEBUG = true;

    /*
    Some states are entered then exited very quickly. I want to see a trail showing
    which states & transitions lead up to the present state.
    The state at index zero is the present state.
    The transition at index zero is the transition which lead to the present state.
    */
    private static readonly ATTRIBUTE_STATE_TRAIL_INDEX = "data-state-trail-index";
    private static readonly ATTRIBUTE_TRANSITION_TRAIL_INDEX = "data-transition-trail-index";
    private static readonly TRAIL_COLORS = ["red", "orange", "yellow"];
    private static readonly TRAIL_LENGTH = StateMachineViewer.TRAIL_COLORS.length;

    private readonly svg: SVGElement;
    private readonly stateTrail: SVGGElement[] = [];
    private readonly transitionTrail: SVGGElement[] = [];

    public constructor(svgElement: SVGSVGElement) {
        this.svg = svgElement;

        this.createStyleElementInSVG();
    }

    private createStyleElementInSVG(): void {

        // https://stackoverflow.com/a/4906603
        const styleElement = window.document.createElementNS("http://www.w3.org/2000/svg", "style");

        const lines: string[] = [];

        for (let trailIdx = 0; trailIdx < StateMachineViewer.TRAIL_LENGTH; trailIdx++) {
            const color = StateMachineViewer.TRAIL_COLORS[trailIdx];

            if (trailIdx === 0) {
                // this is the present state. make the text bold and make the outline thicker
                lines.push(`g[${StateMachineViewer.ATTRIBUTE_STATE_TRAIL_INDEX}="${trailIdx}"] polygon {fill: ${color}; stroke-width: 3}`);
                lines.push(`g[${StateMachineViewer.ATTRIBUTE_STATE_TRAIL_INDEX}="${trailIdx}"] text {font-weight: bold}`);
            } else {
                lines.push(`g[${StateMachineViewer.ATTRIBUTE_STATE_TRAIL_INDEX}="${trailIdx}"] polygon {fill: ${color}}`);
            }

            lines.push(`g[${StateMachineViewer.ATTRIBUTE_TRANSITION_TRAIL_INDEX}="${trailIdx}"] path {stroke: ${color}; stroke-width: 4}`);
            lines.push(`g[${StateMachineViewer.ATTRIBUTE_TRANSITION_TRAIL_INDEX}="${trailIdx}"] polygon {fill: ${color}; stroke: ${color}; stroke-width: 4}`);
            lines.push(`g[${StateMachineViewer.ATTRIBUTE_TRANSITION_TRAIL_INDEX}="${trailIdx}"] text {fill: ${color}; font-weight: bold}`);
        }


        styleElement.textContent = lines.join("\n");
        this.svg.appendChild(styleElement);
    }

    public updateTrail(previousStateName: string | null, newStateName: string): void {

        if (this.DEBUG && previousStateName) {
            console.log(`stateMachineViewer: ${previousStateName} --> ${newStateName}`);
        }

        const svgGroupForState = this.svg.querySelector<SVGGElement>(`g#${newStateName}`);
        if (svgGroupForState) {

            // add element to the beginning of the array
            this.stateTrail.unshift(svgGroupForState);

            if (this.stateTrail.length > StateMachineViewer.TRAIL_LENGTH) {
                // remove the last element from the array
                this.stateTrail.pop()?.removeAttribute(StateMachineViewer.ATTRIBUTE_STATE_TRAIL_INDEX);
            }

            // update the indexes
            for (let trailIdx = 0; trailIdx < this.stateTrail.length; trailIdx++) {
                this.stateTrail[trailIdx].setAttribute(StateMachineViewer.ATTRIBUTE_STATE_TRAIL_INDEX, trailIdx.toString());
            }

        }

        if (previousStateName) {
            const groupForTransition = this.svg.querySelector<SVGGElement>(`g#${previousStateName}_to_${newStateName}`);
            if (groupForTransition) {

                // add element to the beginning of the  array
                this.transitionTrail.unshift(groupForTransition);

                if (this.transitionTrail.length > StateMachineViewer.TRAIL_LENGTH) {
                    // remove the last element of the array
                    this.transitionTrail.pop()?.removeAttribute(StateMachineViewer.ATTRIBUTE_TRANSITION_TRAIL_INDEX);
                }

                // update indexes
                for (let trailIdx = 0; trailIdx < this.transitionTrail.length; trailIdx++) {
                    this.transitionTrail[trailIdx].setAttribute(StateMachineViewer.ATTRIBUTE_TRANSITION_TRAIL_INDEX, trailIdx.toString());
                }
            }
        }

    }
}