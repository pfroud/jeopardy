import { createSvgElement, querySelectorAndCheck } from "../commonFunctions";

type TrailStyle = { color: string, strokeWidth: number };

/**
 * This thing takes an SVG state diagram and shows the current state
 * and which states and transitions led to the current state.
 * 
 * Some state are entered then immediately exited (possibly an impure state machine)
*/
export class StateMachineHistoryVisualizer {

    /**
     * Set this attribute on SVG elements to keep track of what index in the trail they are.
     * Index zero is the current state, index one is the previous state, etc.
     * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/data-*
     */
    private static readonly ATTRIBUTE_STATE_TRAIL_INDEX = "data-state-trail-index";

    /**
     * Set this attribute on SVG elements to keep track of what index in the trail they are.
     * Index zero is the transition that led to the current state. Index one is the
     * transition that led to the previous state. Etc
     * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/data-*
     */
    private static readonly ATTRIBUTE_TRANSITION_TRAIL_INDEX = "data-transition-trail-index";

    /**
     * This color is very light gray, almost white. Use it for lines and text because the page
     * has a dark theme. The background color is #222222.
     */
    public static readonly FOREGROUND_COLOR = "#dddddd";

    /**
     * The length of the trail and what each index looks like are specified here.
     * Index zero is the current state and the transition which lead to the current state.
     * Index one is the previous state and the transition which led to that state.
     * 
     */
    private static readonly TRAIL_STYLES: TrailStyle[] = [
        { color: "lime", strokeWidth: 10 },
        // see https://developer.mozilla.org/en-US/docs/Web/CSS/color_value/color-mix
        { color: `color-mix(in lab, lime 60%, ${StateMachineHistoryVisualizer.FOREGROUND_COLOR})`, strokeWidth: 5 },
        { color: `color-mix(in lab, lime 20%, ${StateMachineHistoryVisualizer.FOREGROUND_COLOR})`, strokeWidth: 5 },
    ];


    private readonly SVG: SVGElement;

    /**
     * SVG groups for the states which are currently in the trail.
     * Each group contains:
     * 
     *   - a &lt;polygon&gt; for the rectangle
     *   - a &lt;text&gt; for the text
     * 
     * Index zero is SVG group for the current state, index one is
     * SVG group for the previous state, etc.
     * */
    private readonly STATE_TRAIL: SVGGElement[] = [];

    /**
     * SVG groups for the transitions which are currently in the trail.
     * Each group contains:
     * 
     *   - a &lt;path&gt; for the line excluding the arrowhead
     *   - a &lt;polygon&gt; for the arrowhead only
     *   - a &lt;text&gt; for the label
     * 
     * Index zero is the group for the transition that led to the current state.
     * Index one is the group for the transition that led to the previous state.
     * And so on.
     */
    private readonly TRANSITION_TRAIL: SVGGElement[] = [];

    /**
     * Call this constructor after the states have been converted to an SVG and added to the page.
     */
    public constructor(svgElement: SVGSVGElement) {
        this.SVG = svgElement;
        this.createStyleElement();
    }

    /**
     * Add a <style> tag containing CSS into the SVG.
     * 
     * I am using custom CSS variables to make it easier to change colors using the web browser inspector.
     * For every index in the trail, several SVG elements need different attributes changed to change the
     * color.
     * 
     * Each state has two SVG elements:
     * 
     *   | SVG tag         | Purpose       | Color to change |
     *   | --------------- | ------------- | --------------- |
     *   | &lt;polygon&gt; | Shape outline | Stroke          |
     *   | &lt;text&gt;    | Text          | Fill            |
     * 
     * Each transition has three SVG elements:
     * 
     *   | SVG tag         | Purpose                      | Color to change |
     *   | --------------- | ---------------------------- | --------------- |
     *   | &lt;path&gt;    | Line excluding arrowhead     | Stroke          |
     *   | &lt;polygon&gt; | Arrowhead only               | Fill and stroke |
     *   | &lt;Text&gt;    | Text                         | Fill            |
     * 
     * Using CSS variables lets you change a color using the browser inspector and have it
     * updated in all those places.
     * 
     * (Once a color is decided then it needs to be manually copied into this typescript file.)
     * 
     * @see https://developer.mozilla.org/en-US/docs/Web/CSS/Using_CSS_custom_properties
     * 
     */
    private createStyleElement(): void {

        // Define the custom CSS property (aka CSS variable) names in only one place
        const propNameGetters:
            // see https://www.typescriptlang.org/docs/handbook/2/mapped-types.html
            { [styleType in keyof TrailStyle]: (trailIndex: number) => string }
            = {
            color: (trailIndex: number): string => `--trail-index-${trailIndex}-color`,
            strokeWidth: (trailIndex: number): string => `--trail-index-${trailIndex}-stroke-width`,
        };

        const styleTag = createSvgElement("style");

        // Declare the custom CSS variables
        styleTag.append(":root {");
        for (let trailIndex = 0; trailIndex < StateMachineHistoryVisualizer.TRAIL_STYLES.length; trailIndex++) {
            const styleObject = StateMachineHistoryVisualizer.TRAIL_STYLES[trailIndex];
            const styleKeys = Object.keys(styleObject) as (keyof TrailStyle)[];
            styleKeys.forEach(key => {
                styleTag.append(`${propNameGetters[key](trailIndex)}: ${styleObject[key]};`);
            });
        }
        styleTag.append("}");

        // Add CSS rules for each index in the trail
        for (let trailIndex = 0; trailIndex < StateMachineHistoryVisualizer.TRAIL_STYLES.length; trailIndex++) {

            const propNameForColor = propNameGetters.color(trailIndex);
            const propNameForStrokeWidth = propNameGetters.strokeWidth(trailIndex);

            // Attribute selectors used below, see https://developer.mozilla.org/en-US/docs/Web/CSS/Attribute_selectors

            // Add rules for states (nodes)
            // see https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_nesting/Using_CSS_nesting
            styleTag.append(`g.node[${StateMachineHistoryVisualizer.ATTRIBUTE_STATE_TRAIL_INDEX} = "${trailIndex}"] {`);

            if (trailIndex === 0) {
                // Scale the whole group for index zero only. Move this to the TrailStyle type?
                styleTag.append("transform: scale(120%);");
                styleTag.append("transform-box: border-box;");
                styleTag.append("transform-origin: center;");
            }

            // <polygon> is the shape outline
            styleTag.append(`polygon {`);
            styleTag.append(`stroke: var(${propNameForColor});`);
            styleTag.append(`stroke-width: var(${propNameForStrokeWidth});`);
            styleTag.append(`}`);

            styleTag.append(`text {`);
            styleTag.append(`font-weight: bold;`);
            styleTag.append(`fill: var(${propNameForColor});`);
            styleTag.append(`}`);

            styleTag.append(`}`); // close selector for the state (node) group

            // Add rules for transitions (edges)
            styleTag.append(`g.edge[${StateMachineHistoryVisualizer.ATTRIBUTE_TRANSITION_TRAIL_INDEX} = "${trailIndex}"] { `);

            // <path> is the line excluding arrowhead
            styleTag.append(`path {`);
            styleTag.append(`stroke: var(${propNameForColor});`);
            styleTag.append(`stroke-width: var(${propNameForStrokeWidth});`);
            styleTag.append(`}`);

            // <polygon> is the arrowhead only. Increase the stroke width to make it bigger to match the width of the path.
            styleTag.append(`$polygon {`);
            styleTag.append(`fill: var(${propNameForColor});`);
            styleTag.append(`stroke: var(${propNameForColor});`);
            styleTag.append(`stroke-width: var(${propNameForStrokeWidth});`);
            styleTag.append(`}`);

            styleTag.append(`text {`);
            styleTag.append(`font-weight: bold;`);
            styleTag.append(`fill: var(${propNameForColor});`);
            styleTag.append(`}`);

            styleTag.append(`}`); // close selector for the transition group
        }


        this.SVG.append(styleTag);
    }

    public updateTrail(previousStateName: string | null, newStateName: string): void {

        const svgGroupForNewState = querySelectorAndCheck<SVGGElement>(this.SVG, `g#${newStateName}`);

        // Add element to the beginning of the array (it becomes index zero)
        this.STATE_TRAIL.unshift(svgGroupForNewState);

        if (this.STATE_TRAIL.length > StateMachineHistoryVisualizer.TRAIL_STYLES.length) {
            // Remove the last element from the array (remove the element with greatest index)
            this.STATE_TRAIL.pop()?.removeAttribute(StateMachineHistoryVisualizer.ATTRIBUTE_STATE_TRAIL_INDEX);
        }

        // Set attributes on SVG elements to reflect new indexes
        for (let trailIdx = 0; trailIdx < this.STATE_TRAIL.length; trailIdx++) {
            this.STATE_TRAIL[trailIdx].setAttribute(StateMachineHistoryVisualizer.ATTRIBUTE_STATE_TRAIL_INDEX, trailIdx.toString());
        }


        if (previousStateName) {
            const groupForTransition = querySelectorAndCheck<SVGGElement>(this.SVG, `g#${previousStateName}_to_${newStateName}`);

            // The transition might not exist if the user manually changes state
            if (groupForTransition) {

                // Add element to the beginning of the array (it becomes index zero)
                this.TRANSITION_TRAIL.unshift(groupForTransition);

                if (this.TRANSITION_TRAIL.length > StateMachineHistoryVisualizer.TRAIL_STYLES.length) {
                    // Remove the last element from the array (remove the element with greatest index)
                    this.TRANSITION_TRAIL.pop()?.removeAttribute(StateMachineHistoryVisualizer.ATTRIBUTE_TRANSITION_TRAIL_INDEX);
                }

                // Set attributes on SVG elements to reflect new indexes
                for (let trailIdx = 0; trailIdx < this.TRANSITION_TRAIL.length; trailIdx++) {
                    this.TRANSITION_TRAIL[trailIdx].setAttribute(StateMachineHistoryVisualizer.ATTRIBUTE_TRANSITION_TRAIL_INDEX, trailIdx.toString());
                }
            }
        }

    }
}