import { createSvgElement, querySelectorAndCheck } from "../commonFunctions";

export class StateMachineViewer {

    /*
    Some states are entered then immediately exited. I want to see a trail showing
    which states & transitions lead up to the present state.
    The state at index zero is the present state.
    The transition at index zero is the transition which lead to the present state.
    */
    private static readonly ATTRIBUTE_STATE_TRAIL_INDEX = "data-state-trail-index";
    private static readonly ATTRIBUTE_TRANSITION_TRAIL_INDEX = "data-transition-trail-index";
    private static readonly TRAIL_COLORS = ["red", "orange", "yellow"];
    private static readonly TRAIL_LENGTH = StateMachineViewer.TRAIL_COLORS.length;

    private readonly SVG: SVGElement;
    private readonly STATE_TRAIL: SVGGElement[] = [];
    private readonly TRANSITION_TRAIL: SVGGElement[] = [];

    /**
     * The StateMachineViewer constructor is called after the states have been converted 
     * to an SVG and added to the page.
     */
    public constructor(svgElement: SVGSVGElement) {
        this.SVG = svgElement;

        this.createStyleElementInSVG();
    }

    private createStyleElementInSVG(): void {

        const styleTag = createSvgElement("style");

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

        styleTag.textContent = lines.join("\n");
        this.SVG.appendChild(styleTag);
    }

    public updateTrail(previousStateName: string | null, newStateName: string): void {

        const svgGroupForState = querySelectorAndCheck<SVGGElement>(this.SVG, `g#${newStateName}`);
        if (svgGroupForState) {

            // add element to the beginning of the array
            this.STATE_TRAIL.unshift(svgGroupForState);

            if (this.STATE_TRAIL.length > StateMachineViewer.TRAIL_LENGTH) {
                // remove the last element from the array
                this.STATE_TRAIL.pop()?.removeAttribute(StateMachineViewer.ATTRIBUTE_STATE_TRAIL_INDEX);
            }

            // update the indexes
            for (let trailIdx = 0; trailIdx < this.STATE_TRAIL.length; trailIdx++) {
                this.STATE_TRAIL[trailIdx].setAttribute(StateMachineViewer.ATTRIBUTE_STATE_TRAIL_INDEX, trailIdx.toString());
            }

        }

        if (previousStateName) {
            const groupForTransition = this.SVG.querySelector<SVGGElement>(`g#${previousStateName}_to_${newStateName}`);
            if (groupForTransition) {

                // add element to the beginning of the  array
                this.TRANSITION_TRAIL.unshift(groupForTransition);

                if (this.TRANSITION_TRAIL.length > StateMachineViewer.TRAIL_LENGTH) {
                    // remove the last element of the array
                    this.TRANSITION_TRAIL.pop()?.removeAttribute(StateMachineViewer.ATTRIBUTE_TRANSITION_TRAIL_INDEX);
                }

                // update indexes
                for (let trailIdx = 0; trailIdx < this.TRANSITION_TRAIL.length; trailIdx++) {
                    this.TRANSITION_TRAIL[trailIdx].setAttribute(StateMachineViewer.ATTRIBUTE_TRANSITION_TRAIL_INDEX, trailIdx.toString());
                }
            }
        }

    }
}