import { StateMachineState, StateMachineTransition, TransitionType } from "./stateInterfaces";


export function generateDotFileForGraphviz(stateArray: StateMachineState[]): string {

    // TODO need to add onExit and onEnter functions!!!!

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
                case TransitionType.Keyboard: {
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
                case TransitionType.Promise: {
                    let transitionLabel = transition.type.toString();
                    if (transition.guardCondition) {
                        transitionLabel += ` [${transition.guardCondition.name.replace("bound ", "")}] `;
                    }
                    const transitionID = `${state.name}_to_${transition.destination}`;
                    dotFileLines.push(`\t${state.name} -> ${transition.destination} [label="${transitionLabel}", id="${transitionID}"];`);
                    break;
                }
                case TransitionType.Timeout: {
                    let transitionLabel = transition.type.toString() + ": " + transition.countdownTimerSource;

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
                case TransitionType.ManualTrigger: {
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

                case TransitionType.If: {
                    const condition = transition.condition.name.replace("bound ", "");

                    let labelThen = "if(" + condition + ")";
                    if (transition.then.onTransitionThen) {
                        labelThen += ` / ${transition.then.onTransitionThen.name.replace("bound ", "")}()`;
                    }
                    const idThen = `${state.name}_to_${transition.then.destination}`;

                    let labelElse = "if(!" + condition + ")";
                    if (transition.else.onTransitionElse) {
                        labelElse += ` / ${transition.else.onTransitionElse.name.replace("bound ", "")}()`;
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
