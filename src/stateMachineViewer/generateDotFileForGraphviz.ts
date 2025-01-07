import { StateMachineState, StateMachineTransition } from "../stateMachine/typesForStateMachine";
import { StateMachineViewer } from "./StateMachineViewer";

/**
 * Convert state machine states & transitions into a string of the Graphviz graph description language.
 * The language is called DOT which is difficult to include in function names.
 * See https://graphviz.org/doc/info/lang.html
 * 
 * "dot" is also the name of the Graphviz executable to draw directed graphs.
 * See https://graphviz.org/docs/layouts/dot/
 * 
 * @param stateArray the state machine states to convert into Graphviz
 * @returns a DOT language string
 */
export function stateMachineToGraphviz(stateArray: StateMachineState[]): string {


    const dotFileLines: string[] = [];
    dotFileLines.push('digraph jeopardy {\n');

    // The ID attribute is copied to the SVG. Here it makes the top-level group be <g id="jeopardy">
    dotFileLines.push('graph [id="jeopardy"];');

    /*
    Font handling is pretty wonky, setting fontnames="svg" results in 
    the font-family being set to "monospace" instead of "Courier" which
    seems good. See:
    https://graphviz.org/faq/font/#what-about-svg-fonts
    https://graphviz.org/docs/attrs/fontnames/
    */
    dotFileLines.push('fontnames = "svg"');

    dotFileLines.push(`bgcolor = "transparent"`);

    const color = StateMachineViewer.FOREGROUND_COLOR;

    // The color attribute is the node outline only, not the fill.
    dotFileLines.push(`node [color="${color}", fontcolor="${color}", fontname="Courier", shape="rect"];`);
    dotFileLines.push(`edge [color="${color}", fontcolor="${color}", fontname="Arial"];\n`);

    stateArray.forEach((state: StateMachineState) => {

        let stateLabel = `<b>${state.NAME}</b>`;
        if (state.ON_ENTER) {
            stateLabel += `<br/>onEnter: ${state.ON_ENTER.name.replace("bound ", "")}()`;
        }
        if (state.ON_EXIT) {
            stateLabel += `<br/>onExit: ${state.ON_EXIT.name.replace("bound ", "")}()`;
        }
        dotFileLines.push(`${state.NAME} [label= < ${stateLabel} >, id="${state.NAME}"];`);

        state.TRANSITIONS.forEach((transition) => {


            switch (transition.TYPE) {
                case "keyboard": {
                    let transitionLabel = "keyboard: ";
                    if (transition.KEYBOARD_KEYS === " ") {
                        transitionLabel += "space";
                    } else {
                        transitionLabel += `\\"${transition.KEYBOARD_KEYS}\\"`;
                    }

                    if (transition.GUARD_CONDITION) {
                        transitionLabel += ` [${transition.GUARD_CONDITION.name.replace("bound ", "")}] `;
                    }

                    if (transition.ON_TRANSITION) {
                        transitionLabel += ` / ${transition.ON_TRANSITION.name.replace("bound ", "")}()`;
                    }

                    const transitionID = `${state.NAME}_to_${transition.DESTINATION}`;

                    dotFileLines.push(`${state.NAME} -> ${transition.DESTINATION} [label="${transitionLabel}", id="${transitionID}"];`);
                    break;
                }

                case "timeout": {
                    let transitionLabel = `${transition.TYPE.toString()}: `;

                    transitionLabel += `${transition.BEHAVIOR} ${transition.INITIAL_DURATION_MILLISEC} ms`;

                    if (transition.GUARD_CONDITION) {
                        transitionLabel += ` [${transition.GUARD_CONDITION.name.replace("bound ", "")}] `;
                    }

                    if (transition.ON_TRANSITION) {
                        transitionLabel += ` / ${transition.ON_TRANSITION.name.replace("bound ", "")}()`;
                    }

                    const transitionID = `${state.NAME}_to_${transition.DESTINATION}`;
                    dotFileLines.push(`${state.NAME} -> ${transition.DESTINATION} [label="${transitionLabel}", id="${transitionID}"];`);
                    break;
                }

                case "manualTrigger": {
                    let transitionLabel = `${transition.TYPE.toString()}: \\"${transition.TRIGGER_NAME.replace("manualTrigger_", "")}\\"`;
                    if (transition.GUARD_CONDITION) {
                        transitionLabel += ` [${transition.GUARD_CONDITION.name.replace("bound ", "")}] `;
                    }
                    if (transition.ON_TRANSITION) {
                        transitionLabel += ` / ${transition.ON_TRANSITION.name.replace("bound ", "")}()`;
                    }

                    const transitionID = `${state.NAME}_to_${transition.DESTINATION}`;
                    dotFileLines.push(`${state.NAME} -> ${transition.DESTINATION} [label="${transitionLabel}", id="${transitionID}"];`);
                    break;
                }

                case "if": {
                    const condition = transition.CONDITION.name.replace("bound ", "");

                    let labelThen = `if(${condition})`;
                    if (transition.THEN.ON_TRANSITION) {
                        labelThen += ` / ${transition.THEN.ON_TRANSITION.name.replace("bound ", "")}()`;
                    }
                    const idThen = `${state.NAME}_to_${transition.THEN.DESTINATION}`;

                    let labelElse = `if(!${condition})`;
                    if (transition.ELSE.ON_TRANSITION) {
                        labelElse += ` / ${transition.ELSE.ON_TRANSITION.name.replace("bound ", "")}()`;
                    }
                    const idElse = `${state.NAME}_to_${transition.ELSE.DESTINATION}`;

                    dotFileLines.push(`${state.NAME} -> ${transition.THEN.DESTINATION} [label="${labelThen}", id="${idThen}"];`);
                    dotFileLines.push(`${state.NAME} -> ${transition.ELSE.DESTINATION} [label="${labelElse}", id="${idElse}"];`);
                    break;
                }

                case "keyboardWithIf": {
                    let keyboardLabel = "keyboard: ";
                    if (transition.KEYBOARD_KEYS === " ") {
                        keyboardLabel += "space";
                    } else {
                        keyboardLabel += `\\"${transition.KEYBOARD_KEYS}\\"`;
                    }

                    const condition = transition.CONDITION.name.replace("bound ", "");

                    let labelThen = `${keyboardLabel} if(${condition})`;
                    if (transition.THEN.ON_TRANSITION) {
                        labelThen += ` / ${transition.THEN.ON_TRANSITION.name.replace("bound ", "")}()`;
                    }
                    const idThen = `${state.NAME}_to_${transition.THEN.DESTINATION}`;

                    let labelElse = `${keyboardLabel} if(!${condition})`;
                    if (transition.ELSE.ON_TRANSITION) {
                        labelElse += ` / ${transition.ELSE.ON_TRANSITION.name.replace("bound ", "")}()`;
                    }
                    const idElse = `${state.NAME}_to_${transition.ELSE.DESTINATION}`;

                    dotFileLines.push(`${state.NAME} -> ${transition.THEN.DESTINATION} [label="${labelThen}", id="${idThen}"];`);
                    dotFileLines.push(`${state.NAME} -> ${transition.ELSE.DESTINATION} [label="${labelElse}", id="${idElse}"];`);
                    break;
                }

                default:
                    throw new TypeError(`unknown transition type "${(transition as StateMachineTransition).TYPE}"`);
            }

        });
        dotFileLines.push(""); // empty string becomes one newline because the whole array gets joined with \n

    });
    dotFileLines.push("}");

    return dotFileLines.join("\n");

}
