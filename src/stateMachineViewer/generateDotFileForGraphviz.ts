import { StateMachineState } from "../stateMachine/typesForStateMachine";

/**
 * Convert state machine states into a string of the Graphviz graph description language.
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
    dotFileLines.push('digraph jeopardy {');
    dotFileLines.push('\tgraph [id="jeopardy"];');
    dotFileLines.push('\tnode [shape="rect", fontname="Courier"];\n'); // https://graphviz.org/doc/info/attrs.html#d:fontname

    stateArray.forEach((state: StateMachineState) => {


        let stateLabel = "<b>" + state.NAME + "</b>";
        if (state.ON_ENTER) {
            stateLabel += "<br/>onEnter: " + state.ON_ENTER.name.replace("bound ", "") + "()";
        }
        if (state.ON_EXIT) {
            stateLabel += "<br/>onExit: " + state.ON_EXIT.name.replace("bound ", "") + "()";
        }
        dotFileLines.push(`\t${state.NAME} [label= < ${stateLabel} >, id="${state.NAME}"];`);

        state.TRANSITIONS.forEach((transition) => {


            switch (transition.TYPE) {
                case "keyboard": {
                    let transitionLabel = "keyboard: ";
                    if (transition.KEYBOARD_KEYS === " ") {
                        transitionLabel += "space";
                    } else {
                        transitionLabel += '\\"' + transition.KEYBOARD_KEYS + '\\"';
                    }

                    if (transition.GUARD_CONDITION) {
                        transitionLabel += ` [${transition.GUARD_CONDITION.name.replace("bound ", "")}] `;
                    }

                    if (transition.ON_TRANSITION) {
                        transitionLabel += ` / ${transition.ON_TRANSITION.name.replace("bound ", "")}()`;
                    }

                    const transitionID = `${state.NAME}_to_${transition.DESTINATION}`;

                    dotFileLines.push(`\t${state.NAME} -> ${transition.DESTINATION} [label="${transitionLabel}", id="${transitionID}"];`);
                    break;

                }
                case "timeout": {
                    let transitionLabel = transition.TYPE.toString() + ": ";

                    transitionLabel += `${transition.BEHAVIOR} ${transition.INITIAL_DURATION} ms`;

                    if (transition.GUARD_CONDITION) {
                        transitionLabel += ` [${transition.GUARD_CONDITION.name.replace("bound ", "")}] `;
                    }

                    if (transition.ON_TRANSITION) {
                        transitionLabel += ` / ${transition.ON_TRANSITION.name.replace("bound ", "")}()`;
                    }

                    const transitionID = `${state.NAME}_to_${transition.DESTINATION}`;
                    dotFileLines.push(`\t${state.NAME} -> ${transition.DESTINATION} [label="${transitionLabel}", id="${transitionID}"];`);
                    break;
                }
                case "manualTrigger": {
                    let transitionLabel = transition.TYPE.toString() + ': \\"' + transition.TRIGGER_NAME.replace("manualTrigger_", "") + '\\"';
                    if (transition.GUARD_CONDITION) {
                        transitionLabel += ` [${transition.GUARD_CONDITION.name.replace("bound ", "")}] `;
                    }
                    if (transition.ON_TRANSITION) {
                        transitionLabel += ` / ${transition.ON_TRANSITION.name.replace("bound ", "")}()`;
                    }

                    const transitionID = `${state.NAME}_to_${transition.DESTINATION}`;
                    dotFileLines.push(`\t${state.NAME} -> ${transition.DESTINATION} [label="${transitionLabel}", id="${transitionID}"];`);
                    break;
                }

                case "if": {
                    const condition = transition.CONDITION.name.replace("bound ", "");

                    let labelThen = "if(" + condition + ")";
                    if (transition.THEN.ON_TRANSITION) {
                        labelThen += ` / ${transition.THEN.ON_TRANSITION.name.replace("bound ", "")}()`;
                    }
                    const idThen = `${state.NAME}_to_${transition.THEN.DESTINATION}`;

                    let labelElse = "if(!" + condition + ")";
                    if (transition.ELSE.ON_TRANSITION) {
                        labelElse += ` / ${transition.ELSE.ON_TRANSITION.name.replace("bound ", "")}()`;
                    }
                    const idElse = `${state.NAME}_to_${transition.ELSE.DESTINATION}`;

                    dotFileLines.push(`\t${state.NAME} -> ${transition.THEN.DESTINATION} [label="${labelThen}", id="${idThen}"];`);
                    dotFileLines.push(`\t${state.NAME} -> ${transition.ELSE.DESTINATION} [label="${labelElse}", id="${idElse}"];`);
                    break;
                }

                default:
                    throw new TypeError("unknown transition type!");
            }

        });
        dotFileLines.push(""); // empty string becomes one newline because the whole array gets joined wih t\n

    });
    dotFileLines.push("}");

    return dotFileLines.join("\n");

}
