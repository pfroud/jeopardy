import { StateMachineState, StateMachineTransition } from "../stateMachine/stateInterfaces";

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


        let stateLabel = "<b>" + state.name + "</b>";
        if (state.onEnter) {
            stateLabel += "<br/>onEnter: " + state.onEnter.name.replace("bound ", "") + "()";
        }
        if (state.onExit) {
            stateLabel += "<br/>onExit: " + state.onExit.name.replace("bound ", "") + "()";
        }
        dotFileLines.push(`\t${state.name} [label= < ${stateLabel} >, id="${state.name}"];`);

        state.transitions.forEach((transition: StateMachineTransition) => {


            switch (transition.type) {
                case "keyboard": {
                    let transitionLabel = "keyboard: ";
                    if (transition.keyboardKeys === " ") {
                        transitionLabel += "space";
                    } else {
                        transitionLabel += '\\"' + transition.keyboardKeys + '\\"';
                    }

                    if (transition.guardCondition) {
                        transitionLabel += ` [${transition.guardCondition.name.replace("bound ", "")}] `;
                    }

                    if (transition.onTransition) {
                        transitionLabel += ` / ${transition.onTransition.name.replace("bound ", "")}()`;
                    }

                    const transitionID = `${state.name}_to_${transition.destination}`;

                    dotFileLines.push(`\t${state.name} -> ${transition.destination} [label="${transitionLabel}", id="${transitionID}"];`);
                    break;

                }
                case "promise": {
                    let transitionLabel = transition.type.toString();
                    if (transition.guardCondition) {
                        transitionLabel += ` [${transition.guardCondition.name.replace("bound ", "")}] `;
                    }
                    const transitionID = `${state.name}_to_${transition.destination}`;
                    dotFileLines.push(`\t${state.name} -> ${transition.destination} [label="${transitionLabel}", id="${transitionID}"];`);
                    break;
                }
                case "timeout": {
                    let transitionLabel = transition.type.toString() + ": ";

                    transitionLabel += transition.behavior + " " + transition.initialDuration + "ms";

                    if (transition.guardCondition) {
                        transitionLabel += ` [${transition.guardCondition.name.replace("bound ", "")}] `;
                    }

                    if (transition.onTransition) {
                        transitionLabel += ` / ${transition.onTransition.name.replace("bound ", "")}()`;
                    }

                    const transitionID = `${state.name}_to_${transition.destination}`;
                    dotFileLines.push(`\t${state.name} -> ${transition.destination} [label="${transitionLabel}", id="${transitionID}"];`);
                    break;
                }
                case "manualTrigger": {
                    let transitionLabel = transition.type.toString() + ': \\"' + transition.triggerName.replace("manualTrigger_", "") + '\\"';
                    if (transition.guardCondition) {
                        transitionLabel += ` [${transition.guardCondition.name.replace("bound ", "")}] `;
                    }
                    if (transition.onTransition) {
                        transitionLabel += ` / ${transition.onTransition.name.replace("bound ", "")}()`;
                    }

                    const transitionID = `${state.name}_to_${transition.destination}`;
                    dotFileLines.push(`\t${state.name} -> ${transition.destination} [label="${transitionLabel}", id="${transitionID}"];`);
                    break;
                }

                case "if": {
                    const condition = transition.condition.name.replace("bound ", "");

                    let labelThen = "if(" + condition + ")";
                    if (transition.then.onTransition) {
                        labelThen += ` / ${transition.then.onTransition.name.replace("bound ", "")}()`;
                    }
                    const idThen = `${state.name}_to_${transition.then.destination}`;

                    let labelElse = "if(!" + condition + ")";
                    if (transition.else.onTransition) {
                        labelElse += ` / ${transition.else.onTransition.name.replace("bound ", "")}()`;
                    }
                    const idElse = `${state.name}_to_${transition.else.destination}`;

                    dotFileLines.push(`\t${state.name} -> ${transition.then.destination} [label="${labelThen}", id="${idThen}"];`);
                    dotFileLines.push(`\t${state.name} -> ${transition.else.destination} [label="${labelElse}", id="${idElse}"];`);
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