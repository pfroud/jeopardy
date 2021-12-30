import { StateMachineState, StateMachineTransition, TransitionType } from "./stateInterfaces.js";

export function generateGraphvizImpl(stateArray: StateMachineState[]): void {

    // TODO need to add onExit and onEnter functions!!!!

    const dotFileLines: string[] = [];
    dotFileLines.push('digraph jeopardy {');
    dotFileLines.push('\tgraph [id="jeopardy"];')
    dotFileLines.push('\tnode [shape="rect", fontname="monospace"];\n');

    stateArray.forEach((state: StateMachineState) => {

        dotFileLines.push(`\t${state.name} [id="${state.name}"];`);

        state.transitions.forEach((transition: StateMachineTransition) => {


            switch (transition.type) {
                case TransitionType.Keyboard: {
                    const keys = transition.keyboardKeys;
                    // TODO push stuff to array then use join() instead of string concatenating
                    let label = "keyboard: ";
                    if (keys === " ") {
                        label += "[space]"
                    } else {
                        label += '\\"' + keys + '\\"';
                    }

                    if (transition.fn) {
                        label += ` / ${transition.fn.name}`;
                    }

                    const id = `${state.name}_to_${transition.destination}`;

                    dotFileLines.push(`\t${state.name} -> ${transition.destination} [label="${label}", id="${id}"];`);
                    break;

                }
                case TransitionType.Promise: {
                    const label = transition.type.toString() + ": " + transition.functionToGetPromise;
                    const id = `${state.name}_to_${transition.destination}`;
                    dotFileLines.push(`\t${state.name} -> ${transition.destination} [label="${label}", id="${id}"];`);
                    break;
                }
                case TransitionType.Timeout: {
                    let label: string;
                    if (typeof transition.duration === "number") {
                        label = transition.type.toString() + ": " + (transition.duration / 1000) + "sec";
                    } else {
                        // the timeout is a function which returns a number
                        label = transition.type.toString() + ": " + transition.duration;

                    }
                    if (transition.fn) {
                        label += ` / ${transition.fn.name}`;
                    }

                    const id = `${state.name}_to_${transition.destination}`;
                    dotFileLines.push(`\t${state.name} -> ${transition.destination} [label="${label}", id="${id}"];`);
                    break;
                }
                case TransitionType.ManualTrigger: {
                    let label = transition.type.toString() + ': \\"' + transition.triggerName.replace("manualTrigger_", "") + '\\"';
                    if (transition.fn) {
                        label += ` / ${transition.fn.name}`;
                    }

                    const id = `${state.name}_to_${transition.destination}`;
                    dotFileLines.push(`\t${state.name} -> ${transition.destination} [label="${label}", id="${id}"];`);
                    break;
                }
                case TransitionType.If: {
                    const condition = transition.condition.name;

                    let labelThen = "if(" + condition + ")";
                    if (transition.then.fn) {
                        labelThen += ` / ${transition.then.fn.name}`;
                    }
                    const idThen = `${state.name}_to_${transition.then.destination}`;

                    let labelElse = "if(!" + condition + ")";
                    if (transition.else.fn) {
                        labelElse += ` / ${transition.else.fn.name}`;
                    }
                    const idElse = `${state.name}_to_${transition.else.destination}`;

                    dotFileLines.push(`\t${state.name} -> ${transition.then.destination} [label="${labelThen}", id="${idThen}"];`);
                    dotFileLines.push(`\t${state.name} -> ${transition.else.destination} [label="${labelElse}", id="${idElse}"];`);
                    break;
                }
                default:
                    console.error("unknown transition type!");
                    break;
            }

        });
        dotFileLines.push(""); // empty string becomes one newline because the whole array gets joines wih t\n

    });
    dotFileLines.push("}");

    const joined = dotFileLines.join("\n");

    // max length of string allowed in window.prompt is 2053 so I'm going to open a new window
    const gvDocument = window.open("", "generatedGraphviz", "popup").document;
    gvDocument.title = "Generated DOT for Graphviz";

    const pre = gvDocument.createElement("pre");
    pre.innerText = joined;
    gvDocument.body.appendChild(pre);


}
